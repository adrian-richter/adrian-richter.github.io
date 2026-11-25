<?php
/**
 * PRIVATE CONFIGURATION EXAMPLE – DO NOT DEPLOY THIS FILE IN THE PUBLIC WEB ROOT!
 *
 * Copy into e.g. /home/ACCOUNT/wg-private/toepferkurs-config.php
 * (NOT inside htdocs, public_html or your GitHub Pages repository).
 * Keep the shared_secret out of GitHub and out of screenshots.
 */
return [
    'shared_secret' => 'REPLACE_WITH_A_RANDOM_CODE_OF_AT_LEAST_24_CHARACTERS',
    'database_file' => __DIR__ . '/toepferkurs.sqlite',
    'allowed_origin' => 'https://adrian-richter.com',
];
