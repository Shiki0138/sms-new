const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// Simple auth middleware
function verifyToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

// Mock photo storage (in a real app, this would be a database)
let mockPhotos = [
  {
    id: 'photo-001',
    recordId: 'record-001',
    url: '/images/records/before-001.jpg',
    type: 'before',
    caption: '施術前（根元の新生毛が目立つ状態）',
    uploadedAt: new Date().toISOString()
  },
  {
    id: 'photo-002',
    recordId: 'record-001',
    url: '/images/records/after-001.jpg',
    type: 'after',
    caption: '施術後（艶のある仕上がり）',
    uploadedAt: new Date().toISOString()
  }
];

// Validate record ID format
function validateRecordId(id) {
  if (!id) {
    throw new Error('Record ID is required');
  }
  
  const isValidId = /^[a-zA-Z0-9\-_]+$/.test(id);
  if (!isValidId) {
    throw new Error('Invalid record ID format');
  }
  
  return true;
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Verify authentication
    const user = verifyToken(req);
    
    // Extract record ID from URL parameter
    const recordId = req.query.id;
    
    // Validate record ID
    validateRecordId(recordId);

    switch (req.method) {
      case 'GET':
        // Get all photos for this record
        const recordPhotos = mockPhotos.filter(photo => photo.recordId === recordId);
        
        // Sort by upload date (most recent first)
        recordPhotos.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

        res.json({
          photos: recordPhotos,
          total: recordPhotos.length,
          recordId: recordId
        });
        break;

      case 'POST':
        // Add new photo to this record
        const photoData = req.body;
        
        // Validate required fields
        if (!photoData.type) {
          return res.status(400).json({ 
            message: 'Photo type is required (before, after, during, detail)' 
          });
        }

        // In a real application, this would handle file upload
        // For now, we simulate the photo upload process
        const newPhoto = {
          id: uuidv4(),
          recordId: recordId,
          url: `/images/records/${recordId}-${Date.now()}.jpg`, // Simulated URL
          type: photoData.type,
          caption: photoData.caption || '',
          metadata: {
            originalName: photoData.originalName || 'uploaded-photo.jpg',
            size: photoData.size || 0,
            mimeType: photoData.mimeType || 'image/jpeg'
          },
          uploadedBy: user.username || 'unknown',
          uploadedAt: new Date().toISOString()
        };
        
        mockPhotos.push(newPhoto);
        
        res.status(201).json({
          message: 'Photo uploaded successfully',
          photo: newPhoto
        });
        break;

      case 'DELETE':
        // Delete a specific photo
        const photoId = req.query.photoId;
        
        if (!photoId) {
          return res.status(400).json({ 
            message: 'Photo ID is required for deletion' 
          });
        }

        const photoIndex = mockPhotos.findIndex(photo => 
          photo.id === photoId && photo.recordId === recordId
        );
        
        if (photoIndex === -1) {
          return res.status(404).json({ 
            message: 'Photo not found',
            photoId: photoId,
            recordId: recordId
          });
        }

        // Remove the photo
        const deletedPhoto = mockPhotos.splice(photoIndex, 1)[0];
        
        // In a real application, you would also delete the actual file
        res.json({
          message: 'Photo deleted successfully',
          deletedPhoto: deletedPhoto
        });
        break;

      default:
        res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Photos API error:', error);
    
    // Handle specific error types
    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    if (error.message === 'Record ID is required' || error.message === 'Invalid record ID format') {
      return res.status(400).json({ message: error.message });
    }
    
    // Generic server error
    res.status(500).json({ 
      message: 'Failed to process photos request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}