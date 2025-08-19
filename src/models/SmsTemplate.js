/**
 * SMS Template Model for Enhanced SMS Blast System
 */
class SmsTemplate {
  constructor(data = {}) {
    this.id = data.id;
    this.userId = data.userId;
    this.name = data.name;
    this.description = data.description || '';
    this.category = data.category || 'general'; // general, appointment, promotional, reminder
    this.content = data.content || '';
    this.variables = data.variables || []; // Array of variable names used in template
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.usageCount = data.usageCount || 0;
    this.lastUsed = data.lastUsed || null;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Validation
  validate() {
    const errors = [];

    if (!this.name || this.name.trim().length === 0) {
      errors.push('Template name is required');
    }

    if (!this.content || this.content.trim().length === 0) {
      errors.push('Template content is required');
    }

    if (this.content && this.content.length > 1600) {
      errors.push('Template content exceeds SMS maximum length (1600 characters)');
    }

    if (!this.userId) {
      errors.push('User ID is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Extract variables from content
  extractVariables() {
    const variableRegex = /{{(\w+)}}/g;
    const matches = [];
    let match;

    while ((match = variableRegex.exec(this.content)) !== null) {
      if (!matches.includes(match[1])) {
        matches.push(match[1]);
      }
    }

    this.variables = matches;
    return matches;
  }

  // Render template with data
  render(data = {}) {
    let rendered = this.content;

    // Replace variables with actual data
    this.variables.forEach(variable => {
      const regex = new RegExp(`{{${variable}}}`, 'g');
      const value = data[variable] || `{{${variable}}}`;
      rendered = rendered.replace(regex, value);
    });

    return rendered;
  }

  // Update usage statistics
  incrementUsage() {
    this.usageCount += 1;
    this.lastUsed = new Date();
    this.updatedAt = new Date();
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      name: this.name,
      description: this.description,
      category: this.category,
      content: this.content,
      variables: this.variables,
      isActive: this.isActive,
      usageCount: this.usageCount,
      lastUsed: this.lastUsed,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  static fromJSON(data) {
    return new SmsTemplate(data);
  }
}

module.exports = SmsTemplate;