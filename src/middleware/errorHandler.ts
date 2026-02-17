import { Request, Response, NextFunction } from "express";

// Custom error class
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true,
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

// Global error handler middleware
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  console.error("❌ Error:", err);

  // Handle operational errors
  if (err instanceof AppError && err.isOperational) {
    res.status(err.statusCode).json({
      status: "error",
      message: err.message,
    });
    return;
  }

  // Handle Prisma errors
  if (err.name === "PrismaClientKnownRequestError") {
    res.status(400).json({
      status: "error",
      message: "Database error occurred",
    });
    return;
  }

  // Handle validation errors (Zod)
  if (err.name === "ZodError") {
    res.status(400).json({
      status: "error",
      message: "Validation error",
      errors: err,
    });
    return;
  }

  // Handle unknown errors
  res.status(500).json({
    status: "error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
}
