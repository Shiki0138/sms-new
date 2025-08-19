/**
 * SMS Segment Model for Customer Segmentation
 */
class SmsSegment {
  constructor(data = {}) {
    this.id = data.id;
    this.userId = data.userId;
    this.name = data.name;
    this.description = data.description || '';
    this.criteria = data.criteria || {};
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.customerCount = data.customerCount || 0;
    this.lastCalculated = data.lastCalculated || null;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Validation
  validate() {
    const errors = [];

    if (!this.name || this.name.trim().length === 0) {
      errors.push('Segment name is required');
    }

    if (!this.userId) {
      errors.push('User ID is required');
    }

    if (!this.criteria || Object.keys(this.criteria).length === 0) {
      errors.push('Segment criteria is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Apply segmentation criteria to customer list
  filterCustomers(customers) {
    let filtered = [...customers];
    const { criteria } = this;

    // Filter by visit count
    if (criteria.visitCount) {
      const { min, max } = criteria.visitCount;
      filtered = filtered.filter(customer => {
        const visits = customer.visitCount || 0;
        return visits >= (min || 0) && (!max || visits <= max);
      });
    }

    // Filter by last visit days
    if (criteria.lastVisitDays) {
      const { min, max } = criteria.lastVisitDays;
      const now = new Date();
      filtered = filtered.filter(customer => {
        if (!customer.lastVisitDate) return min > 0;
        
        const daysSinceVisit = Math.floor(
          (now - new Date(customer.lastVisitDate)) / (1000 * 60 * 60 * 24)
        );
        return daysSinceVisit >= (min || 0) && (!max || daysSinceVisit <= max);
      });
    }

    // Filter by total sales
    if (criteria.totalSales) {
      const { min, max } = criteria.totalSales;
      filtered = filtered.filter(customer => {
        const sales = customer.totalSales || 0;
        return sales >= (min || 0) && (!max || sales <= max);
      });
    }

    // Filter by customer tags
    if (criteria.tags && criteria.tags.length > 0) {
      filtered = filtered.filter(customer => {
        if (!customer.tags || customer.tags.length === 0) return false;
        return criteria.tags.some(tag => customer.tags.includes(tag));
      });
    }

    // Filter by age range
    if (criteria.ageRange) {
      const { min, max } = criteria.ageRange;
      const currentYear = new Date().getFullYear();
      filtered = filtered.filter(customer => {
        if (!customer.birthDate) return false;
        
        const birthYear = new Date(customer.birthDate).getFullYear();
        const age = currentYear - birthYear;
        return age >= (min || 0) && (!max || age <= max);
      });
    }

    // Filter by gender
    if (criteria.gender) {
      filtered = filtered.filter(customer => customer.gender === criteria.gender);
    }

    // Filter by birth month (for birthday campaigns)
    if (criteria.birthMonth) {
      filtered = filtered.filter(customer => {
        if (!customer.birthDate) return false;
        const birthMonth = new Date(customer.birthDate).getMonth() + 1;
        return birthMonth === criteria.birthMonth;
      });
    }

    // Filter by phone number availability
    if (criteria.hasPhoneNumber) {
      filtered = filtered.filter(customer => 
        customer.phoneNumber && customer.phoneNumber.trim().length > 0
      );
    }

    return filtered;
  }

  // Update customer count
  updateCustomerCount(count) {
    this.customerCount = count;
    this.lastCalculated = new Date();
    this.updatedAt = new Date();
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      name: this.name,
      description: this.description,
      criteria: this.criteria,
      isActive: this.isActive,
      customerCount: this.customerCount,
      lastCalculated: this.lastCalculated,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  static fromJSON(data) {
    return new SmsSegment(data);
  }
}

module.exports = SmsSegment;