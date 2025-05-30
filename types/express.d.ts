// Extending Express Request Interface
declare namespace Express {
  export interface Request {
    roles?: string[];
    user?: string;
  }
}
