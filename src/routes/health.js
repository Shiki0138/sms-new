const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabase/client');
const { version } = require('../../package.json');
const os = require('os');

/**
 * @route   GET /api/health
 * @desc    Basic health check
 * @access  Public
 */
router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'SMS System is running',
    timestamp: new Date().toISOString(),
    version
  });
});

/**
 * @route   GET /api/health/detailed
 * @desc    Detailed health check with system info
 * @access  Public
 */
router.get('/detailed', async (req, res) => {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version,
    uptime: process.uptime(),
    system: {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        percentage: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2) + '%'
      },
      cpu: {
        cores: os.cpus().length,
        model: os.cpus()[0]?.model
      }
    },
    process: {
      pid: process.pid,
      memory: process.memoryUsage(),
      uptime: process.uptime()
    }
  };

  res.json(healthData);
});

/**
 * @route   GET /api/health/supabase
 * @desc    Check Supabase connection
 * @access  Public
 */
router.get('/supabase', async (req, res) => {
  const checks = {
    database: { status: 'unknown', message: '', latency: null },
    auth: { status: 'unknown', message: '', latency: null },
    storage: { status: 'unknown', message: '', latency: null }
  };

  // Check database connection
  try {
    const start = Date.now();
    const { data, error } = await supabase
      .from('tenants')
      .select('count')
      .limit(1);
    
    const latency = Date.now() - start;

    if (error) {
      checks.database.status = 'unhealthy';
      checks.database.message = error.message;
    } else {
      checks.database.status = 'healthy';
      checks.database.message = 'Database connection successful';
      checks.database.latency = `${latency}ms`;
    }
  } catch (error) {
    checks.database.status = 'unhealthy';
    checks.database.message = error.message;
  }

  // Check auth service
  try {
    const start = Date.now();
    const { data: { session }, error } = await supabase.auth.getSession();
    const latency = Date.now() - start;

    if (error) {
      checks.auth.status = 'unhealthy';
      checks.auth.message = error.message;
    } else {
      checks.auth.status = 'healthy';
      checks.auth.message = 'Auth service accessible';
      checks.auth.latency = `${latency}ms`;
    }
  } catch (error) {
    checks.auth.status = 'unhealthy';
    checks.auth.message = error.message;
  }

  // Check storage (if buckets exist)
  try {
    const start = Date.now();
    const { data, error } = await supabase.storage.listBuckets();
    const latency = Date.now() - start;

    if (error) {
      checks.storage.status = 'unhealthy';
      checks.storage.message = error.message;
    } else {
      checks.storage.status = 'healthy';
      checks.storage.message = `Storage service accessible (${data?.length || 0} buckets)`;
      checks.storage.latency = `${latency}ms`;
    }
  } catch (error) {
    checks.storage.status = 'warning';
    checks.storage.message = 'Storage check skipped';
  }

  // Overall status
  const allHealthy = Object.values(checks).every(check => 
    check.status === 'healthy' || check.status === 'warning'
  );

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    checks,
    supabaseUrl: process.env.SUPABASE_URL ? 'configured' : 'not configured'
  });
});

/**
 * @route   GET /api/health/dependencies
 * @desc    Check all external dependencies
 * @access  Public
 */
router.get('/dependencies', async (req, res) => {
  const dependencies = {
    supabase: { status: 'checking', message: '' },
    email: { status: 'checking', message: '' },
    sms: { status: 'checking', message: '' },
    line: { status: 'checking', message: '' },
    instagram: { status: 'checking', message: '' }
  };

  // Check Supabase
  try {
    const { error } = await supabase.from('tenants').select('count').limit(1);
    dependencies.supabase = {
      status: error ? 'unhealthy' : 'healthy',
      message: error ? error.message : 'Connected successfully'
    };
  } catch (error) {
    dependencies.supabase = {
      status: 'unhealthy',
      message: error.message
    };
  }

  // Check Email service (if configured)
  if (process.env.EMAIL_SERVICE) {
    dependencies.email = {
      status: 'configured',
      message: `Using ${process.env.EMAIL_SERVICE}`
    };
  } else {
    dependencies.email = {
      status: 'not configured',
      message: 'Email service not configured'
    };
  }

  // Check SMS service (Twilio)
  if (process.env.TWILIO_ACCOUNT_SID) {
    dependencies.sms = {
      status: 'configured',
      message: 'Twilio configured'
    };
  } else {
    dependencies.sms = {
      status: 'not configured',
      message: 'SMS service not configured'
    };
  }

  // Check LINE
  if (process.env.LINE_CHANNEL_ACCESS_TOKEN) {
    dependencies.line = {
      status: 'configured',
      message: 'LINE channel configured'
    };
  } else {
    dependencies.line = {
      status: 'not configured',
      message: 'LINE integration not configured'
    };
  }

  // Check Instagram
  if (process.env.INSTAGRAM_ACCESS_TOKEN) {
    dependencies.instagram = {
      status: 'configured',
      message: 'Instagram API configured'
    };
  } else {
    dependencies.instagram = {
      status: 'not configured',
      message: 'Instagram integration not configured'
    };
  }

  res.json({
    status: 'checked',
    timestamp: new Date().toISOString(),
    dependencies
  });
});

/**
 * @route   POST /api/health/test-connection
 * @desc    Test Supabase connection with sample operations
 * @access  Public (consider making this admin-only in production)
 */
router.post('/test-connection', async (req, res) => {
  const tests = [];
  
  // Test 1: Basic SELECT query
  try {
    const start = Date.now();
    const { data, error } = await supabase
      .from('tenants')
      .select('id, name, plan_type')
      .limit(5);
    
    tests.push({
      name: 'Basic SELECT query',
      status: error ? 'failed' : 'passed',
      duration: `${Date.now() - start}ms`,
      result: error ? error.message : `Retrieved ${data?.length || 0} tenants`,
      error: error || null
    });
  } catch (error) {
    tests.push({
      name: 'Basic SELECT query',
      status: 'failed',
      error: error.message
    });
  }

  // Test 2: RPC function call (if exists)
  try {
    const start = Date.now();
    const { data, error } = await supabase.rpc('get_tenant_dashboard_stats', {
      p_tenant_id: '00000000-0000-0000-0000-000000000000' // dummy ID
    });
    
    tests.push({
      name: 'RPC function call',
      status: error ? 'failed' : 'passed',
      duration: `${Date.now() - start}ms`,
      result: error ? error.message : 'RPC function accessible',
      error: error || null
    });
  } catch (error) {
    tests.push({
      name: 'RPC function call',
      status: 'skipped',
      message: 'RPC function not available or not configured'
    });
  }

  // Test 3: Auth session check
  try {
    const start = Date.now();
    const { data: { session }, error } = await supabase.auth.getSession();
    
    tests.push({
      name: 'Auth session check',
      status: 'passed',
      duration: `${Date.now() - start}ms`,
      result: session ? 'Active session found' : 'No active session',
      error: error || null
    });
  } catch (error) {
    tests.push({
      name: 'Auth session check',
      status: 'failed',
      error: error.message
    });
  }

  // Test 4: Real-time subscription (brief test)
  try {
    const start = Date.now();
    const channel = supabase
      .channel('test_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tenants' }, () => {})
      .subscribe();
    
    // Wait briefly and unsubscribe
    await new Promise(resolve => setTimeout(resolve, 100));
    await supabase.removeChannel(channel);
    
    tests.push({
      name: 'Real-time subscription',
      status: 'passed',
      duration: `${Date.now() - start}ms`,
      result: 'Real-time connection established and closed'
    });
  } catch (error) {
    tests.push({
      name: 'Real-time subscription',
      status: 'failed',
      error: error.message
    });
  }

  // Calculate summary
  const summary = {
    total: tests.length,
    passed: tests.filter(t => t.status === 'passed').length,
    failed: tests.filter(t => t.status === 'failed').length,
    skipped: tests.filter(t => t.status === 'skipped').length
  };

  const allPassed = summary.failed === 0;

  res.status(allPassed ? 200 : 500).json({
    status: allPassed ? 'all tests passed' : 'some tests failed',
    timestamp: new Date().toISOString(),
    summary,
    tests,
    supabaseUrl: process.env.SUPABASE_URL ? 'configured' : 'not configured'
  });
});

/**
 * @route   GET /api/health/readiness
 * @desc    Kubernetes-style readiness probe
 * @access  Public
 */
router.get('/readiness', async (req, res) => {
  try {
    // Check if we can connect to Supabase
    const { error } = await supabase
      .from('tenants')
      .select('count')
      .limit(1);

    if (error) {
      return res.status(503).json({
        status: 'not ready',
        reason: 'Database connection failed',
        error: error.message
      });
    }

    res.json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      reason: 'Health check failed',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/health/liveness
 * @desc    Kubernetes-style liveness probe
 * @access  Public
 */
router.get('/liveness', (req, res) => {
  // Simple liveness check - if the server can respond, it's alive
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;