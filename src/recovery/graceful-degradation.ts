/**
 * Graceful Degradation System for ARCHITECT-BRAVO
 * Provides fallback mechanisms when services are unavailable
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/logger';
import { CircuitBreakerManager } from './circuit-breaker';

export enum DegradationLevel {
  FULL_SERVICE = 'full_service',
  PARTIAL_DEGRADATION = 'partial_degradation',
  MINIMAL_SERVICE = 'minimal_service',
  EMERGENCY_MODE = 'emergency_mode'
}

export interface DegradationRule {
  id: string;
  name: string;
  priority: number;
  triggers: DegradationTrigger[];
  actions: DegradationAction[];
  condition: (metrics: SystemMetrics) => boolean;
  autoRecover: boolean;
  recoveryCondition?: (metrics: SystemMetrics) => boolean;
  maxDuration?: number; // milliseconds
}

export interface DegradationTrigger {
  type: 'circuit_breaker_open' | 'response_time_high' | 'error_rate_high' | 'resource_exhausted' | 'custom';
  threshold?: number;
  duration?: number;
  services?: string[];
  customCheck?: (metrics: SystemMetrics) => boolean;
}

export interface DegradationAction {
  type: 'disable_feature' | 'use_cache' | 'reduce_functionality' | 'fallback_service' | 'throttle_requests' | 'custom';
  target: string;
  parameters: Record<string, any>;
  customAction?: (target: string, parameters: Record<string, any>) => Promise<void>;
}

export interface SystemMetrics {
  timestamp: Date;
  responseTime: {
    p50: number;
    p95: number;
    p99: number;
  };
  errorRate: number;
  throughput: number;
  circuitBreakers: Record<string, 'open' | 'closed' | 'half-open'>;
  resourceUsage: {
    cpu: number;
    memory: number;
    diskSpace: number;
  };
  activeConnections: number;
  queueSize: number;
  customMetrics: Record<string, number>;
}

export interface FallbackStrategy {
  id: string;
  name: string;
  service: string;
  priority: number;
  implementation: 'cache' | 'simplified' | 'offline' | 'external_service' | 'custom';
  config: Record<string, any>;
  execute: (originalRequest: any) => Promise<any>;
}

export interface DegradationState {
  level: DegradationLevel;
  activeRules: string[];
  activeFallbacks: string[];
  disabledFeatures: string[];
  startTime: Date;
  metrics: SystemMetrics;
  reason: string;
}

export class GracefulDegradationManager extends EventEmitter {
  private currentState: DegradationState;
  private rules: Map<string, DegradationRule> = new Map();
  private fallbackStrategies: Map<string, FallbackStrategy> = new Map();
  private featureFlags: Map<string, boolean> = new Map();
  private logger: Logger;
  private metricsCollectionInterval: NodeJS.Timeout | null = null;
  private circuitBreakerManager: CircuitBreakerManager;

  constructor(circuitBreakerManager: CircuitBreakerManager) {
    super();
    this.logger = new Logger('GracefulDegradationManager');
    this.circuitBreakerManager = circuitBreakerManager;
    
    this.currentState = {
      level: DegradationLevel.FULL_SERVICE,
      activeRules: [],
      activeFallbacks: [],
      disabledFeatures: [],
      startTime: new Date(),
      metrics: this.createEmptyMetrics(),
      reason: 'System initialized'
    };

    this.initializeDefaultRules();
    this.startMetricsCollection();
    
    this.logger.info('Graceful degradation manager initialized');
  }

  /**
   * Register a degradation rule
   */
  registerRule(rule: DegradationRule): void {
    this.rules.set(rule.id, rule);
    this.logger.info(`Degradation rule registered: ${rule.name}`, { ruleId: rule.id });
  }

  /**
   * Register a fallback strategy
   */
  registerFallbackStrategy(strategy: FallbackStrategy): void {
    this.fallbackStrategies.set(strategy.id, strategy);
    this.logger.info(`Fallback strategy registered: ${strategy.name}`, { 
      strategyId: strategy.id, 
      service: strategy.service 
    });
  }

  /**
   * Check system health and apply degradation if needed
   */
  async evaluateSystemHealth(metrics?: SystemMetrics): Promise<void> {
    const currentMetrics = metrics || await this.collectMetrics();
    
    // Sort rules by priority (higher priority first)
    const sortedRules = Array.from(this.rules.values())
      .sort((a, b) => b.priority - a.priority);

    let degradationNeeded = false;
    let triggeredRules: DegradationRule[] = [];

    // Check each rule
    for (const rule of sortedRules) {
      if (this.evaluateRule(rule, currentMetrics)) {
        triggeredRules.push(rule);
        degradationNeeded = true;
      }
    }

    if (degradationNeeded && !this.isAlreadyDegraded(triggeredRules)) {
      await this.applyDegradation(triggeredRules, currentMetrics);
    } else if (!degradationNeeded && this.currentState.level !== DegradationLevel.FULL_SERVICE) {
      await this.attemptRecovery(currentMetrics);
    }
  }

  /**
   * Execute a service call with fallback protection
   */
  async executeWithFallback<T>(
    serviceName: string,
    operation: () => Promise<T>,
    fallbackId?: string
  ): Promise<T> {
    // Check if service is degraded
    if (this.isServiceDegraded(serviceName)) {
      return this.executeFallback(serviceName, operation, fallbackId);
    }

    try {
      return await operation();
    } catch (error) {
      this.logger.warn(`Service ${serviceName} failed, attempting fallback`, { error });
      return this.executeFallback(serviceName, operation, fallbackId);
    }
  }

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(featureName: string): boolean {
    if (this.currentState.disabledFeatures.includes(featureName)) {
      return false;
    }
    return this.featureFlags.get(featureName) ?? true;
  }

  /**
   * Disable a feature
   */
  disableFeature(featureName: string, reason: string): void {
    if (!this.currentState.disabledFeatures.includes(featureName)) {
      this.currentState.disabledFeatures.push(featureName);
      this.featureFlags.set(featureName, false);
      
      this.logger.warn(`Feature disabled: ${featureName}`, { reason });
      this.emit('featureDisabled', { feature: featureName, reason });
    }
  }

  /**
   * Enable a feature
   */
  enableFeature(featureName: string): void {
    const index = this.currentState.disabledFeatures.indexOf(featureName);
    if (index > -1) {
      this.currentState.disabledFeatures.splice(index, 1);
      this.featureFlags.set(featureName, true);
      
      this.logger.info(`Feature enabled: ${featureName}`);
      this.emit('featureEnabled', { feature: featureName });
    }
  }

  /**
   * Get current degradation state
   */
  getCurrentState(): DegradationState {
    return { ...this.currentState };
  }

  /**
   * Force degradation to a specific level
   */
  async forceDegradation(
    level: DegradationLevel, 
    reason: string,
    duration?: number
  ): Promise<void> {
    const previousLevel = this.currentState.level;
    
    this.currentState.level = level;
    this.currentState.reason = reason;
    this.currentState.startTime = new Date();
    
    await this.applyDegradationLevel(level);
    
    this.logger.warn(`Forced degradation from ${previousLevel} to ${level}`, { reason });
    this.emit('degradationForced', { 
      previousLevel, 
      currentLevel: level, 
      reason 
    });

    // Auto-recovery after duration
    if (duration) {
      setTimeout(async () => {
        await this.forceRecovery('Duration expired');
      }, duration);
    }
  }

  /**
   * Force recovery to full service
   */
  async forceRecovery(reason: string): Promise<void> {
    const previousLevel = this.currentState.level;
    
    this.currentState.level = DegradationLevel.FULL_SERVICE;
    this.currentState.activeRules = [];
    this.currentState.activeFallbacks = [];
    this.currentState.disabledFeatures = [];
    this.currentState.reason = reason;
    
    // Re-enable all features
    for (const [feature] of this.featureFlags) {
      this.featureFlags.set(feature, true);
    }
    
    this.logger.info(`Forced recovery from ${previousLevel} to full service`, { reason });
    this.emit('recoveryForced', { 
      previousLevel, 
      reason 
    });
  }

  private evaluateRule(rule: DegradationRule, metrics: SystemMetrics): boolean {
    // Check custom condition first
    if (rule.condition && !rule.condition(metrics)) {
      return false;
    }

    // Check individual triggers
    for (const trigger of rule.triggers) {
      if (this.evaluateTrigger(trigger, metrics)) {
        return true;
      }
    }

    return false;
  }

  private evaluateTrigger(trigger: DegradationTrigger, metrics: SystemMetrics): boolean {
    switch (trigger.type) {
      case 'circuit_breaker_open':
        if (trigger.services) {
          return trigger.services.some(service => 
            metrics.circuitBreakers[service] === 'open'
          );
        }
        return Object.values(metrics.circuitBreakers).some(state => state === 'open');

      case 'response_time_high':
        return trigger.threshold ? metrics.responseTime.p95 > trigger.threshold : false;

      case 'error_rate_high':
        return trigger.threshold ? metrics.errorRate > trigger.threshold : false;

      case 'resource_exhausted':
        const cpuExhausted = metrics.resourceUsage.cpu > (trigger.threshold || 90);
        const memoryExhausted = metrics.resourceUsage.memory > (trigger.threshold || 90);
        return cpuExhausted || memoryExhausted;

      case 'custom':
        return trigger.customCheck ? trigger.customCheck(metrics) : false;

      default:
        return false;
    }
  }

  private async applyDegradation(
    triggeredRules: DegradationRule[],
    metrics: SystemMetrics
  ): Promise<void> {
    const previousLevel = this.currentState.level;
    const newLevel = this.calculateDegradationLevel(triggeredRules);
    
    this.currentState.level = newLevel;
    this.currentState.activeRules = triggeredRules.map(rule => rule.id);
    this.currentState.startTime = new Date();
    this.currentState.metrics = metrics;
    this.currentState.reason = `Triggered by: ${triggeredRules.map(r => r.name).join(', ')}`;

    // Apply actions from all triggered rules
    for (const rule of triggeredRules) {
      for (const action of rule.actions) {
        await this.executeAction(action);
      }
    }

    await this.applyDegradationLevel(newLevel);
    
    this.logger.warn(`System degraded from ${previousLevel} to ${newLevel}`, {
      triggeredRules: triggeredRules.map(r => r.name),
      metrics
    });
    
    this.emit('systemDegraded', {
      previousLevel,
      currentLevel: newLevel,
      triggeredRules: triggeredRules.map(r => r.id),
      metrics
    });
  }

  private async attemptRecovery(metrics: SystemMetrics): Promise<void> {
    // Check if auto-recovery is allowed for active rules
    const activeRules = this.currentState.activeRules
      .map(id => this.rules.get(id))
      .filter(rule => rule !== undefined) as DegradationRule[];

    const canRecover = activeRules.every(rule => {
      if (!rule.autoRecover) return false;
      if (rule.recoveryCondition) {
        return rule.recoveryCondition(metrics);
      }
      return !this.evaluateRule(rule, metrics);
    });

    if (canRecover) {
      const previousLevel = this.currentState.level;
      
      this.currentState.level = DegradationLevel.FULL_SERVICE;
      this.currentState.activeRules = [];
      this.currentState.activeFallbacks = [];
      this.currentState.disabledFeatures = [];
      this.currentState.reason = 'Auto-recovery completed';

      // Re-enable all features
      for (const [feature] of this.featureFlags) {
        this.featureFlags.set(feature, true);
      }

      this.logger.info(`System recovered from ${previousLevel} to full service`);
      this.emit('systemRecovered', {
        previousLevel,
        metrics
      });
    }
  }

  private calculateDegradationLevel(triggeredRules: DegradationRule[]): DegradationLevel {
    const maxPriority = Math.max(...triggeredRules.map(rule => rule.priority));
    
    if (maxPriority >= 90) return DegradationLevel.EMERGENCY_MODE;
    if (maxPriority >= 70) return DegradationLevel.MINIMAL_SERVICE;
    if (maxPriority >= 50) return DegradationLevel.PARTIAL_DEGRADATION;
    
    return DegradationLevel.FULL_SERVICE;
  }

  private async executeAction(action: DegradationAction): Promise<void> {
    switch (action.type) {
      case 'disable_feature':
        this.disableFeature(action.target, 'Degradation rule triggered');
        break;

      case 'use_cache':
        this.enableCacheFallback(action.target, action.parameters);
        break;

      case 'reduce_functionality':
        this.reduceFunctionality(action.target, action.parameters);
        break;

      case 'fallback_service':
        this.activateFallbackService(action.target, action.parameters);
        break;

      case 'throttle_requests':
        this.throttleRequests(action.target, action.parameters);
        break;

      case 'custom':
        if (action.customAction) {
          await action.customAction(action.target, action.parameters);
        }
        break;
    }
  }

  private async applyDegradationLevel(level: DegradationLevel): Promise<void> {
    switch (level) {
      case DegradationLevel.PARTIAL_DEGRADATION:
        this.disableFeature('advanced_analytics', 'Partial degradation');
        this.disableFeature('background_processing', 'Partial degradation');
        break;

      case DegradationLevel.MINIMAL_SERVICE:
        this.disableFeature('advanced_analytics', 'Minimal service');
        this.disableFeature('background_processing', 'Minimal service');
        this.disableFeature('real_time_updates', 'Minimal service');
        this.disableFeature('notifications', 'Minimal service');
        break;

      case DegradationLevel.EMERGENCY_MODE:
        // Disable all non-essential features
        const nonEssentialFeatures = [
          'advanced_analytics', 'background_processing', 'real_time_updates',
          'notifications', 'file_uploads', 'export_functionality'
        ];
        nonEssentialFeatures.forEach(feature => 
          this.disableFeature(feature, 'Emergency mode')
        );
        break;
    }
  }

  private async executeFallback<T>(
    serviceName: string,
    originalOperation: () => Promise<T>,
    fallbackId?: string
  ): Promise<T> {
    const fallbackStrategy = fallbackId 
      ? this.fallbackStrategies.get(fallbackId)
      : this.findBestFallbackStrategy(serviceName);

    if (!fallbackStrategy) {
      throw new Error(`No fallback strategy available for service: ${serviceName}`);
    }

    try {
      const result = await fallbackStrategy.execute(originalOperation);
      
      if (!this.currentState.activeFallbacks.includes(fallbackStrategy.id)) {
        this.currentState.activeFallbacks.push(fallbackStrategy.id);
      }
      
      this.logger.info(`Fallback executed successfully`, {
        service: serviceName,
        strategy: fallbackStrategy.name
      });
      
      return result;
    } catch (error) {
      this.logger.error(`Fallback strategy failed`, {
        service: serviceName,
        strategy: fallbackStrategy.name,
        error
      });
      throw error;
    }
  }

  private findBestFallbackStrategy(serviceName: string): FallbackStrategy | undefined {
    const strategies = Array.from(this.fallbackStrategies.values())
      .filter(strategy => strategy.service === serviceName)
      .sort((a, b) => b.priority - a.priority);

    return strategies[0];
  }

  private isServiceDegraded(serviceName: string): boolean {
    return this.currentState.disabledFeatures.includes(serviceName) ||
           this.currentState.level === DegradationLevel.EMERGENCY_MODE;
  }

  private isAlreadyDegraded(triggeredRules: DegradationRule[]): boolean {
    const newRuleIds = triggeredRules.map(rule => rule.id);
    return this.currentState.activeRules.every(id => newRuleIds.includes(id)) &&
           newRuleIds.every(id => this.currentState.activeRules.includes(id));
  }

  private enableCacheFallback(target: string, parameters: Record<string, any>): void {
    // Implementation for cache fallback
    this.logger.info(`Cache fallback enabled for ${target}`, { parameters });
  }

  private reduceFunctionality(target: string, parameters: Record<string, any>): void {
    // Implementation for reducing functionality
    this.logger.info(`Functionality reduced for ${target}`, { parameters });
  }

  private activateFallbackService(target: string, parameters: Record<string, any>): void {
    // Implementation for fallback service activation
    this.logger.info(`Fallback service activated for ${target}`, { parameters });
  }

  private throttleRequests(target: string, parameters: Record<string, any>): void {
    // Implementation for request throttling
    this.logger.info(`Request throttling activated for ${target}`, { parameters });
  }

  private async collectMetrics(): Promise<SystemMetrics> {
    // In a real implementation, this would collect actual system metrics
    const circuitBreakerHealth = this.circuitBreakerManager.getSystemHealth();
    
    return {
      timestamp: new Date(),
      responseTime: {
        p50: Math.random() * 100,
        p95: Math.random() * 500,
        p99: Math.random() * 1000
      },
      errorRate: Math.random() * 0.1,
      throughput: Math.random() * 1000,
      circuitBreakers: this.getCircuitBreakerStates(),
      resourceUsage: {
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        diskSpace: Math.random() * 100
      },
      activeConnections: Math.floor(Math.random() * 100),
      queueSize: Math.floor(Math.random() * 50),
      customMetrics: {}
    };
  }

  private getCircuitBreakerStates(): Record<string, 'open' | 'closed' | 'half-open'> {
    const stats = this.circuitBreakerManager.getAllStats();
    const states: Record<string, 'open' | 'closed' | 'half-open'> = {};
    
    for (const stat of stats) {
      states[stat.name] = stat.state.toLowerCase() as 'open' | 'closed' | 'half-open';
    }
    
    return states;
  }

  private createEmptyMetrics(): SystemMetrics {
    return {
      timestamp: new Date(),
      responseTime: { p50: 0, p95: 0, p99: 0 },
      errorRate: 0,
      throughput: 0,
      circuitBreakers: {},
      resourceUsage: { cpu: 0, memory: 0, diskSpace: 0 },
      activeConnections: 0,
      queueSize: 0,
      customMetrics: {}
    };
  }

  private startMetricsCollection(): void {
    this.metricsCollectionInterval = setInterval(async () => {
      try {
        await this.evaluateSystemHealth();
      } catch (error) {
        this.logger.error('Error during metrics collection', { error });
      }
    }, 30000); // Every 30 seconds
  }

  private initializeDefaultRules(): void {
    // High error rate rule
    this.registerRule({
      id: 'high-error-rate',
      name: 'High Error Rate',
      priority: 70,
      triggers: [{
        type: 'error_rate_high',
        threshold: 0.1 // 10%
      }],
      actions: [{
        type: 'disable_feature',
        target: 'advanced_analytics',
        parameters: {}
      }],
      condition: (metrics) => metrics.errorRate > 0.1,
      autoRecover: true,
      recoveryCondition: (metrics) => metrics.errorRate < 0.05
    });

    // Circuit breaker open rule
    this.registerRule({
      id: 'circuit-breakers-open',
      name: 'Multiple Circuit Breakers Open',
      priority: 80,
      triggers: [{
        type: 'circuit_breaker_open'
      }],
      actions: [{
        type: 'reduce_functionality',
        target: 'api_endpoints',
        parameters: { reduction: 50 }
      }],
      condition: (metrics) => {
        const openCount = Object.values(metrics.circuitBreakers)
          .filter(state => state === 'open').length;
        return openCount >= 2;
      },
      autoRecover: true
    });

    // Resource exhaustion rule
    this.registerRule({
      id: 'resource-exhaustion',
      name: 'Resource Exhaustion',
      priority: 90,
      triggers: [{
        type: 'resource_exhausted',
        threshold: 95
      }],
      actions: [{
        type: 'throttle_requests',
        target: 'all_endpoints',
        parameters: { rate: 0.5 }
      }],
      condition: (metrics) => 
        metrics.resourceUsage.cpu > 95 || metrics.resourceUsage.memory > 95,
      autoRecover: true,
      recoveryCondition: (metrics) => 
        metrics.resourceUsage.cpu < 80 && metrics.resourceUsage.memory < 80
    });
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
    }
    this.removeAllListeners();
    this.logger.info('Graceful degradation manager destroyed');
  }
}

export default GracefulDegradationManager;