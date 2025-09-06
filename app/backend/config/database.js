/**
 * Firebase Database Configuration
 * Version: 2.0.0
 * Created: 2025-09-06
 * 
 * This module provides the database configuration and client setup for Firebase
 */

const { db, auth } = require('../../shared/firebase-config');

// Environment configuration
const config = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    timestampsInSnapshots: true,
    ignoreUndefinedProperties: true
  }
};

/**
 * Database helper functions for Firebase Firestore
 */
const firebaseDb = {
  /**
   * Execute a query with automatic retry logic
   */
  async query(queryFn, retries = 3) {
    let lastError;
    
    for (let i = 0; i < retries; i++) {
      try {
        const result = await queryFn();
        return result;
      } catch (error) {
        lastError = error;
        
        // Don't retry on certain errors
        if (error.code === 'permission-denied' ||
            error.code === 'unauthenticated' ||
            error.code === 'already-exists') {
          throw error;
        }
        
        // Wait before retry with exponential backoff
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
      }
    }
    
    throw lastError;
  },

  /**
   * Get the current authenticated user
   */
  async getCurrentUser(idToken) {
    if (!idToken) return null;

    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      console.error('Error verifying ID token:', error);
      return null;
    }
  },

  /**
   * Get user details including role
   */
  async getUserDetails(userId) {
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) return null;
      return { id: userDoc.id, ...userDoc.data() };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Check if user has permission for a resource
   */
  async checkPermission(userId, resource, action) {
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) return false;

      const user = userDoc.data();
      
      // Define permission matrix
      const permissions = {
        admin: ['*'], // Admin can do everything
        manager: ['read', 'create', 'update'], // Manager can't delete
        staff: ['read', 'create'] // Staff can only read and create
      };

      const userPermissions = permissions[user.role] || [];
      return userPermissions.includes('*') || userPermissions.includes(action);
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  },

  /**
   * Get collection with filtering
   */
  getCollection(collectionName) {
    return {
      async select(options = {}) {
        let query = db.collection(collectionName);
        
        if (options.filters) {
          Object.entries(options.filters).forEach(([key, value]) => {
            query = query.where(key, '==', value);
          });
        }
        
        if (options.orderBy) {
          query = query.orderBy(options.orderBy.field, options.orderBy.direction || 'asc');
        }
        
        if (options.limit) {
          query = query.limit(options.limit);
        }

        const snapshot = await query.get();
        return {
          data: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
          error: null
        };
      },

      async insert(data) {
        const timestamp = new Date();
        const dataWithTimestamp = {
          ...data,
          createdAt: timestamp,
          updatedAt: timestamp
        };

        const docRef = await db.collection(collectionName).add(dataWithTimestamp);
        const newDoc = await docRef.get();
        
        return {
          data: [{ id: newDoc.id, ...newDoc.data() }],
          error: null
        };
      },

      async update(id, data) {
        const updateData = {
          ...data,
          updatedAt: new Date()
        };

        await db.collection(collectionName).doc(id).update(updateData);
        const updatedDoc = await db.collection(collectionName).doc(id).get();
        
        return {
          data: [{ id: updatedDoc.id, ...updatedDoc.data() }],
          error: null
        };
      },

      async delete(id) {
        await db.collection(collectionName).doc(id).delete();
        return { data: null, error: null };
      },

      async upsert(data) {
        const timestamp = new Date();
        const upsertData = {
          ...data,
          updatedAt: timestamp,
          createdAt: data.id ? undefined : timestamp // Only set createdAt for new docs
        };

        if (data.id) {
          await db.collection(collectionName).doc(data.id).set(upsertData, { merge: true });
          const doc = await db.collection(collectionName).doc(data.id).get();
          return {
            data: [{ id: doc.id, ...doc.data() }],
            error: null
          };
        } else {
          const docRef = await db.collection(collectionName).add(upsertData);
          const newDoc = await docRef.get();
          return {
            data: [{ id: newDoc.id, ...newDoc.data() }],
            error: null
          };
        }
      },

      async findById(id) {
        const doc = await db.collection(collectionName).doc(id).get();
        if (!doc.exists) {
          return { data: null, error: { message: 'Document not found' } };
        }
        return {
          data: { id: doc.id, ...doc.data() },
          error: null
        };
      }
    };
  },

  /**
   * Batch operations
   */
  async batch(operations) {
    const batch = db.batch();
    const results = [];

    try {
      for (const operation of operations) {
        await operation(batch);
      }
      
      await batch.commit();
      return { data: results, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
};

/**
 * Auth helper functions for Firebase
 */
const firebaseAuth = {
  async signUp(email, password, metadata = {}) {
    try {
      const userRecord = await auth.createUser({
        email,
        password,
        displayName: metadata.displayName || metadata.name
      });

      // Create user document in Firestore
      await db.collection('users').doc(userRecord.uid).set({
        email: userRecord.email,
        displayName: userRecord.displayName,
        role: metadata.role || 'staff',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...metadata
      });

      return { data: { user: userRecord }, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async verifyToken(idToken) {
    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      return { data: { user: decodedToken }, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async updateUser(uid, userData) {
    try {
      await auth.updateUser(uid, userData);
      await db.collection('users').doc(uid).update({
        ...userData,
        updatedAt: new Date()
      });
      return { data: { updated: true }, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
};

/**
 * Migration helper for transitioning from Supabase to Firebase
 */
const migration = {
  /**
   * Check if Firebase is properly configured
   */
  isFirebaseEnabled() {
    return !!(config.projectId && db);
  },

  /**
   * Get appropriate data source
   */
  async getDataSource(collectionName) {
    if (this.isFirebaseEnabled()) {
      return firebaseDb.getCollection(collectionName);
    } else {
      // Fallback to in-memory implementation
      console.warn('Firebase not configured, using fallback');
      const inMemoryDb = require('../models');
      return inMemoryDb[collectionName];
    }
  }
};

module.exports = {
  config,
  db: firebaseDb,
  auth: firebaseAuth,
  migration,
  
  // Re-export Firebase instances
  firestore: db,
  firebaseAuth: auth
};