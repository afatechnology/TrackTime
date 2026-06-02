<?php

/**
 * Laragon may use the repo root as DocumentRoot.
 * Forward all web requests into the Laravel public directory.
 */
chdir(__DIR__ . '/api/public');
require __DIR__ . '/api/public/index.php';
