export class EngineNotImplementedError extends Error {
  constructor(engineName: string, methodName: string) {
    super(`${engineName}.${methodName} is not implemented yet.`);
    this.name = "EngineNotImplementedError";
  }
}

export class MissingConfigurationError extends Error {
  constructor(key: string) {
    super(`Missing required configuration: ${key}`);
    this.name = "MissingConfigurationError";
  }
}
