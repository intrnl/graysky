#!/bin/bash

if [[ "$EAS_BUILD_RUNNER" == "eas-build" ]]; then
    npm install -g pnpm@8.9.0
fi