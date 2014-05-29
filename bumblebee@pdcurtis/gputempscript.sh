#!/bin/sh

optirun -b none nvidia-settings -q GPUCoreTemp -t -c :8  > /tmp/.gpuTemperature

exit 0
