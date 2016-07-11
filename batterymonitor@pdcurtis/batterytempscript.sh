#!/bin/sh

# optirun -b none nvidia-settings -q GPUCoreTemp -t -c :8  > /tmp/.gpuTemperature
nvidia-settings -q GPUCoreTemp -t  > /tmp/.gpuTemperature
upower -i $(upower -e | grep BAT) | grep -E percentage | xargs | cut -d' ' -f2|sed s/%// > /tmp/.batteryPercentage
upower -i $(upower -e | grep BAT) | grep -E state | xargs | cut -d' ' -f2|sed s/%// > /tmp/.batteryState
exit 0
