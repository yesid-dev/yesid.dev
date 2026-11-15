import { z } from 'zod';

// The site CSP disallows eval, including Zod's JIT capability probe.
z.config({ jitless: true });
