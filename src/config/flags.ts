const getHardwareConcurrency = () => {
    if (typeof window !== 'undefined' && window.navigator) {
        return window.navigator.hardwareConcurrency || 4;
    }
    return 4;
}

export const featureFlags = {
  enableNearDup: true,
  wasmThreads: getHardwareConcurrency(),
  boundedConcurrency: 5,
};
