let TwilioProvider, AWSSNSProvider;

// Try to load SMS providers only if their dependencies are installed
try {
    TwilioProvider = require('./twilio-provider');
} catch (e) {
    console.warn('Twilio provider not available - install twilio package to enable');
}

try {
    AWSSNSProvider = require('./aws-sns-provider');
} catch (e) {
    console.warn('AWS SNS provider not available - install aws-sdk package to enable');
}

/**
 * SMS Provider Factory
 * Creates and manages SMS provider instances
 */
class ProviderFactory {
  constructor() {
    this.providers = new Map();
    this.defaultProvider = null;
  }

  /**
   * Register available providers
   */
  static getAvailableProviders() {
    const providers = {};
    
    if (TwilioProvider) {
      providers.twilio = TwilioProvider;
    }
    
    if (AWSSNSProvider) {
      providers['aws-sns'] = AWSSNSProvider;
    }
    
    return providers;
  }

  /**
   * Create a provider instance
   * @param {string} providerName - Name of the provider
   * @param {Object} config - Provider configuration
   * @returns {BaseSMSProvider} - Provider instance
   */
  async createProvider(providerName, config) {
    const availableProviders = ProviderFactory.getAvailableProviders();
    
    if (!availableProviders[providerName]) {
      throw new Error(`Unsupported SMS provider: ${providerName}`);
    }

    const ProviderClass = availableProviders[providerName];
    const provider = new ProviderClass(config);
    
    try {
      await provider.initialize();
      this.providers.set(`${providerName}-${Date.now()}`, provider);
      
      // Set as default if it's the first provider
      if (!this.defaultProvider) {
        this.defaultProvider = provider;
      }
      
      console.log(`Provider ${providerName} created and initialized successfully`);
      return provider;
    } catch (error) {
      console.error(`Failed to initialize provider ${providerName}:`, error.message);
      throw error;
    }
  }

  /**
   * Get provider by name or return default
   * @param {string} providerName - Optional provider name
   * @returns {BaseSMSProvider} - Provider instance
   */
  getProvider(providerName = null) {
    if (providerName) {
      const provider = Array.from(this.providers.values())
        .find(p => p.name === providerName);
      
      if (!provider) {
        throw new Error(`Provider ${providerName} not found or not initialized`);
      }
      
      return provider;
    }

    if (!this.defaultProvider) {
      throw new Error('No SMS providers available');
    }

    return this.defaultProvider;
  }

  /**
   * Set default provider
   * @param {string} providerName - Provider name to set as default
   */
  setDefaultProvider(providerName) {
    const provider = this.getProvider(providerName);
    this.defaultProvider = provider;
    console.log(`Default provider set to: ${providerName}`);
  }

  /**
   * Get all initialized providers
   * @returns {Array} - Array of provider instances
   */
  getAllProviders() {
    return Array.from(this.providers.values());
  }

  /**
   * Get provider statistics
   * @returns {Object} - Statistics for all providers
   */
  async getProvidersStats() {
    const stats = {};
    
    for (const [key, provider] of this.providers) {
      try {
        stats[provider.name] = await provider.getStats();
      } catch (error) {
        stats[provider.name] = {
          error: error.message,
          name: provider.name,
          initialized: false
        };
      }
    }

    return {
      defaultProvider: this.defaultProvider?.name || null,
      providers: stats,
      totalProviders: this.providers.size
    };
  }

  /**
   * Remove a provider
   * @param {string} providerName - Provider name to remove
   */
  removeProvider(providerName) {
    const keysToRemove = [];
    
    for (const [key, provider] of this.providers) {
      if (provider.name === providerName) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => {
      const provider = this.providers.get(key);
      if (this.defaultProvider === provider) {
        this.defaultProvider = null;
        // Set new default if other providers exist
        const remaining = this.getAllProviders();
        if (remaining.length > 0) {
          this.defaultProvider = remaining[0];
        }
      }
      this.providers.delete(key);
    });

    console.log(`Provider ${providerName} removed`);
  }

  /**
   * Test provider connectivity
   * @param {string} providerName - Provider to test
   * @returns {Object} - Test result
   */
  async testProvider(providerName) {
    try {
      const provider = this.getProvider(providerName);
      const stats = await provider.getStats();
      
      return {
        success: true,
        provider: providerName,
        initialized: stats.initialized,
        capabilities: stats.capabilities,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        provider: providerName,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Load providers from configuration
   * @param {Object} providersConfig - Configuration object
   */
  async loadProvidersFromConfig(providersConfig) {
    const results = [];
    
    for (const [providerName, config] of Object.entries(providersConfig)) {
      if (config.enabled === false) {
        console.log(`Skipping disabled provider: ${providerName}`);
        continue;
      }

      try {
        const provider = await this.createProvider(providerName, config);
        results.push({
          provider: providerName,
          success: true,
          instance: provider
        });

        // Set as default if specified in config
        if (config.default === true) {
          this.setDefaultProvider(providerName);
        }
      } catch (error) {
        console.error(`Failed to load provider ${providerName}:`, error.message);
        results.push({
          provider: providerName,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }
}

// Singleton instance
const providerFactory = new ProviderFactory();

module.exports = {
  ProviderFactory,
  providerFactory
};