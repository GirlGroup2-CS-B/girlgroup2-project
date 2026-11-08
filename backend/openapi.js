const errorResponse = {
  description: 'The request could not be completed.',
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/Error' }
    }
  }
};

const jsonRequest = (schema) => ({
  required: true,
  content: {
    'application/json': {
      schema: { $ref: `#/components/schemas/${schema}` }
    }
  }
});

const secured = (responses) => ({
  ...responses,
  401: { description: 'Missing or invalid bearer token.' },
  403: { description: 'The account is not permitted to perform this action.' }
});

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'CampusFind API',
    version: '1.0.0',
    description: 'API for the JRMSU Main Campus lost-and-found system.'
  },
  servers: [{ url: 'http://localhost:3000', description: 'Local development server' }],
  tags: [
    { name: 'Health' },
    { name: 'Authentication' },
    { name: 'Items' },
    { name: 'Claims' },
    { name: 'Notifications' },
    { name: 'Administration' }
  ],
  paths: {
    '/': {
      get: {
        tags: ['Health'],
        summary: 'Check whether the API is running',
        responses: {
          200: {
            description: 'API is running.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { message: { type: 'string', example: 'CampusFind API is running...' } }
                }
              }
            }
          }
        }
      }
    },
    '/api/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a student account',
        requestBody: jsonRequest('RegisterRequest'),
        responses: {
          201: { description: 'Account created.' },
          400: errorResponse,
          409: { description: 'An account with this email already exists.' },
          500: errorResponse
        }
      }
    },
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Sign in and receive a JWT',
        requestBody: jsonRequest('LoginRequest'),
        responses: {
          200: { description: 'Signed in successfully.' },
          400: errorResponse,
          401: { description: 'Invalid email or password.' },
          403: { description: 'Account is deactivated.' },
          500: errorResponse
        }
      }
    },
    '/api/auth/google': {
      post: {
        tags: ['Authentication'],
        summary: 'Sign in or register with a Google profile',
        requestBody: jsonRequest('GoogleAuthRequest'),
        responses: {
          200: { description: 'Google authentication successful.' },
          400: errorResponse,
          403: { description: 'Account is deactivated.' },
          500: errorResponse
        }
      }
    },
    '/api/items': {
      get: {
        tags: ['Items'],
        summary: 'List item reports',
        parameters: [
          { in: 'query', name: 'type', schema: { type: 'string', enum: ['LOST', 'FOUND'] } },
          { in: 'query', name: 'category', schema: { type: 'string' } },
          { in: 'query', name: 'search', schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Item reports returned.' },
          500: errorResponse
        }
      },
      post: {
        tags: ['Items'],
        summary: 'Create an item report',
        security: [{ bearerAuth: [] }],
        requestBody: jsonRequest('CreateItemRequest'),
        responses: secured({
          201: { description: 'Report created.' },
          400: errorResponse,
          500: errorResponse
        })
      }
    },
    '/api/items/review-queue': {
      get: {
        tags: ['Items'],
        summary: 'List reports awaiting administrator review',
        security: [{ bearerAuth: [] }],
        responses: secured({ 200: { description: 'Review queue returned.' } })
      }
    },
    '/api/items/mine': {
      get: {
        tags: ['Items'],
        summary: 'List the signed-in user’s item reports',
        security: [{ bearerAuth: [] }],
        responses: secured({ 200: { description: 'User reports returned.' } })
      }
    },
    '/api/items/{id}': {
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      get: {
        tags: ['Items'],
        summary: 'Get an item report',
        responses: { 200: { description: 'Item report returned.' }, 404: errorResponse }
      },
      put: {
        tags: ['Items'],
        summary: 'Update an item report (owner only)',
        security: [{ bearerAuth: [] }],
        requestBody: jsonRequest('UpdateItemRequest'),
        responses: secured({ 200: { description: 'Report updated.' }, 404: errorResponse })
      },
      delete: {
        tags: ['Items'],
        summary: 'Soft-delete an item report (owner only)',
        security: [{ bearerAuth: [] }],
        responses: secured({ 200: { description: 'Report deleted.' }, 404: errorResponse })
      }
    },
    '/api/items/{id}/review': {
      patch: {
        tags: ['Items'],
        summary: 'Approve or reject an item report (administrator only)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: jsonRequest('ReviewItemRequest'),
        responses: secured({
          200: { description: 'Report reviewed.' },
          404: errorResponse,
          409: errorResponse
        })
      }
    },
    '/api/claims/pending': {
      get: {
        tags: ['Claims'],
        summary: 'List claims awaiting administrator review',
        security: [{ bearerAuth: [] }],
        responses: secured({ 200: { description: 'Claim review queue returned.' } })
      }
    },
    '/api/claims/report/{reportId}': {
      get: {
        tags: ['Claims'],
        summary: 'List claims for an item report',
        parameters: [{ in: 'path', name: 'reportId', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Claims returned.' }, 500: errorResponse }
      }
    },
    '/api/claims/my': {
      get: {
        tags: ['Claims'],
        summary: 'List the signed-in user’s claims',
        security: [{ bearerAuth: [] }],
        responses: secured({ 200: { description: 'User claims returned.' } })
      }
    },
    '/api/claims': {
      post: {
        tags: ['Claims'],
        summary: 'Submit a claim',
        security: [{ bearerAuth: [] }],
        requestBody: jsonRequest('CreateClaimRequest'),
        responses: secured({ 201: { description: 'Claim submitted.' }, 400: errorResponse })
      }
    },
    '/api/claims/{id}/review': {
      patch: {
        tags: ['Claims'],
        summary: 'Approve or reject a claim (administrator only)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: jsonRequest('ReviewClaimRequest'),
        responses: secured({ 200: { description: 'Claim reviewed.' }, 400: errorResponse, 404: errorResponse })
      }
    },
    '/api/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'List notifications for the signed-in user',
        security: [{ bearerAuth: [] }],
        responses: secured({ 200: { description: 'Notifications returned.' } })
      }
    },
    '/api/notifications/{id}/read': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark a notification as read',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: secured({ 200: { description: 'Notification marked as read.' }, 404: errorResponse })
      }
    },
    '/api/admin/users': {
      get: {
        tags: ['Administration'],
        summary: 'List campus user accounts (administrator only)',
        security: [{ bearerAuth: [] }],
        responses: secured({
          200: {
            description: 'Account list returned without passwords or credential hashes.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    count: { type: 'integer' },
                    users: { type: 'array', items: { $ref: '#/components/schemas/ManagedUser' } }
                  }
                }
              }
            }
          },
          500: errorResponse
        })
      }
    },
    '/api/admin/stats': {
      get: {
        tags: ['Administration'],
        summary: 'Get account statistics from the PostgreSQL function (administrator only)',
        security: [{ bearerAuth: [] }],
        responses: secured({ 200: { description: 'Live account statistics returned.' }, 500: errorResponse })
      }
    },
    '/api/admin/users/{id}/status': {
      patch: {
        tags: ['Administration'],
        summary: 'Activate or deactivate a student account (administrator only)',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer', minimum: 1 } }],
        requestBody: jsonRequest('UpdateUserStatusRequest'),
        responses: secured({
          200: { description: 'Account status updated.' },
          400: errorResponse,
          404: errorResponse,
          409: { description: 'Self-deactivation and administrator status changes are not allowed.' },
          500: errorResponse
        })
      }
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
    },
    schemas: {
      Error: {
        type: 'object',
        properties: { error: { type: 'string' }, detail: { type: 'string' } }
      },
      RegisterRequest: {
        type: 'object',
        required: ['full_name', 'email', 'student_id', 'password'],
        properties: {
          full_name: { type: 'string', example: 'Juan Dela Cruz' },
          email: { type: 'string', format: 'email', example: 'juan@jrmsu.edu' },
          student_id: { type: 'string', example: '2024-0001' },
          password: { type: 'string', format: 'password', minLength: 8 },
        }
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', format: 'password' }
        }
      },
      GoogleAuthRequest: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          full_name: { type: 'string' },
          student_id: { type: 'string' },
          credential: { type: 'string', description: 'Google credential token (if used by the client).' }
        }
      },
      CreateItemRequest: {
        type: 'object',
        required: ['item_name', 'category', 'description', 'report_type', 'date_lost_or_found', 'location'],
        properties: {
          item_name: { type: 'string' },
          category: { type: 'string' },
          description: { type: 'string' },
          report_type: { type: 'string', enum: ['LOST', 'FOUND'] },
          image_path: { type: 'string' },
          date_lost_or_found: { type: 'string', format: 'date' },
          approximate_time: { type: 'string' },
          location: { type: 'string' },
          additional_details: { type: 'string' },
          contact_preference: { type: 'string' },
          custody_information: { type: 'string' },
          listing_status: { type: 'string' },
          extra_data: { type: 'object', additionalProperties: true }
        }
      },
      UpdateItemRequest: {
        type: 'object',
        description: 'Item fields to update.',
        additionalProperties: true
      },
      ReviewItemRequest: {
        type: 'object',
        required: ['status'],
        properties: { status: { type: 'string', enum: ['approved', 'rejected'] } }
      },
      CreateClaimRequest: {
        type: 'object',
        required: ['item_id', 'explanation'],
        properties: {
          item_id: { type: 'string' },
          explanation: { type: 'string' },
          distinctive_item_details: { type: 'string' },
          approximate_date_lost: { type: 'string' },
          approximate_location_lost: { type: 'string' },
          supporting_evidence_path: { type: 'string' },
          contact_preference: { type: 'string' }
        }
      },
      ReviewClaimRequest: {
        type: 'object',
        required: ['claim_status'],
        properties: {
          claim_status: { type: 'string', enum: ['approved', 'rejected'] },
          reviewer_notes: { type: 'string' }
        }
      },
      UpdateUserStatusRequest: {
        type: 'object',
        required: ['is_active'],
        properties: { is_active: { type: 'boolean' } }
      },
      ManagedUser: {
        type: 'object',
        properties: {
          user_id: { type: 'integer' },
          full_name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          student_id: { type: 'string' },
          role: { type: 'string' },
          authentication_provider: { type: 'string' },
          is_active: { type: 'boolean' },
          created_at: { type: 'string', format: 'date-time' }
        }
      }
    }
  }
};
