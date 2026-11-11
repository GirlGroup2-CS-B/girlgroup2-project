const assert = require('node:assert/strict');
const Module = require('node:module');
const test = require('node:test');

const controllerPath = require.resolve('../controllers/authController');
const userModelPath = require.resolve('../models/userModel');
const bcryptPath = require.resolve('bcryptjs');
const jwtPath = require.resolve('jsonwebtoken');

function loadControllerWithUserRole(role, tokenPayloads) {
  require(bcryptPath);
  require(jwtPath);
  const cachedModules = new Map(
    [controllerPath, userModelPath, bcryptPath, jwtPath].map((filename) => [
      filename,
      require.cache[filename]
    ])
  );
  const userModelModule = new Module(userModelPath);
  userModelModule.filename = userModelPath;
  userModelModule.loaded = true;
  userModelModule.exports = {
    findByEmail: async () => ({
      user_id: 1,
      email: 'student@example.edu',
      role,
      is_active: true,
      password_hash: 'test-hash'
    })
  };
  require.cache[userModelPath] = userModelModule;
  require.cache[bcryptPath].exports = { compare: async () => true };
  require.cache[jwtPath].exports = {
    sign: (payload) => {
      tokenPayloads.push(payload);
      return 'test-access-token';
    }
  };
  delete require.cache[controllerPath];

  const controller = require(controllerPath);
  return {
    controller,
    restore() {
      for (const [filename, cachedModule] of cachedModules) {
        if (cachedModule) {
          require.cache[filename] = cachedModule;
        } else {
          delete require.cache[filename];
        }
      }
    }
  };
}

for (const role of ['student', 'reviewer', 'admin']) {
  test(`login returns the database role "${role}" in the response and token`, async () => {
    const tokenPayloads = [];
    const { controller, restore } = loadControllerWithUserRole(role, tokenPayloads);
    const originalJwtSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'test-secret';

    const response = {
      statusCode: null,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      }
    };

    try {
      await controller.login({
        body: { email: 'student@example.edu', password: 'valid-password' }
      }, response);

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.role, role);
      assert.equal(response.body.access_token, 'test-access-token');
      assert.equal(tokenPayloads[0].role, role);
    } finally {
      restore();
      if (originalJwtSecret === undefined) {
        delete process.env.JWT_SECRET;
      } else {
        process.env.JWT_SECRET = originalJwtSecret;
      }
    }
  });
}
