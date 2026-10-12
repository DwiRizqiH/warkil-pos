import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';

export function validate(schemas) {
  return (req, _res, next) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      // Express 4 caches req.query on the same object; reassigning it has no effect.
      if (schemas.query) Object.assign(req.query, schemas.query.parse(req.query));
      if (schemas.params) Object.assign(req.params, schemas.params.parse(req.params));
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(
          new AppError(
            400,
            'VALIDATION',
            'Input tidak valid',
            err.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }))
          )
        );
        return;
      }
      next(err);
    }
  };
}
