import { NextFunction, Response } from 'express';
import { HttpException } from '@exceptions/HttpException';
import { RequestWithUser } from '@interfaces/auth.interface';

/**
 * @deprecated This Express middleware is deprecated and will be removed in a future version.
 * File validation is now handled by TypeBox schemas in Elysia's native validation system.
 *
 * Migration guide:
 *
 * 1. **Single file upload (avatar, sent picture):**
 *    Before (Express):
 *      router.post('/upload/avatar/:id', multer().single('avatar'), fileMiddleware, controller.uploadAvatar)
 *
 *    After (Elysia):
 *      .post('/upload/avatar/:id', ({ body }) => { ... }, {
 *        body: t.Object({
 *          avatar: AvatarUploadSchema  // From src/schemas/files.schema.ts
 *        })
 *      })
 *
 * 2. **Multiple files upload (identity cards):**
 *    Before (Express):
 *      router.post('/upload/identitycard/:id',
 *        multer().fields([{ name: 'frontSide', maxCount: 1 }, { name: 'backSide', maxCount: 1 }]),
 *        fileMiddleware,
 *        controller.uploadIdentityCard
 *      )
 *
 *    After (Elysia):
 *      .post('/upload/identitycard/:id', ({ body }) => { ... }, {
 *        body: IdentityCardUploadSchema  // From src/schemas/files.schema.ts
 *      })
 *
 * 3. **Multiple pictures upload (post/album pictures):**
 *    Before (Express):
 *      router.post('/upload/pictures/:id', multer().array('pictures'), fileMiddleware, controller.uploadPictures)
 *
 *    After (Elysia):
 *      .post('/upload/pictures/:id', ({ body }) => { ... }, {
 *        body: t.Object({
 *          pictures: PostPicturesUploadSchema  // From src/schemas/files.schema.ts
 *        })
 *      })
 *
 * **Available TypeBox file schemas** (from `src/schemas/files.schema.ts`):
 * - `AvatarUploadSchema`: Single image file (JPEG, PNG, WebP) under 5MB
 * - `IdentityCardUploadSchema`: Two files (frontSide, backSide) - images or PDF under 5MB each
 * - `PostPicturesUploadSchema`: 1-20 image files (JPEG, PNG, WebP) under 5MB each
 * - `SentPictureUploadSchema`: Single image file (JPEG, PNG, WebP) under 5MB
 *
 * **Benefits of TypeBox validation:**
 * - Automatic file size and type validation (no separate middleware needed)
 * - Type-safe file access in route handlers
 * - Better error messages with field-level validation details
 * - Integrated with Elysia's validation system
 * - OpenAPI documentation generation for file uploads
 * - No need for multer configuration
 */
const fileMiddleware = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    if (req.files) {
      const fileeData = req.files;

      const filesTooLarge = [];
      if (fileeData.frontSide) {
        for (const key in fileeData) {
          if (fileeData[key][0].size > 5000000) filesTooLarge.push(fileeData[key][0].fieldname);
        }
        if (filesTooLarge.length > 0) {
          return next(
            new HttpException(
              500,
              `${
                filesTooLarge.length > 0
                  ? "a file is too large maximum is 5mb and a file isn't an image"
                  : filesTooLarge.length > 0 && 'a file is too large'
              }`,
            ),
          );
        }

        next();
      } else {
        for (const key in fileeData) {
          if (fileeData[key].size > 5000000) filesTooLarge.push(fileeData[key].fieldname);
        }
        if (filesTooLarge.length > 0) {
          return next(
            new HttpException(
              500,
              `${
                filesTooLarge.length > 0
                  ? "a file is too large maximum is 5mb and a file isn't an image"
                  : filesTooLarge.length > 0 && 'a file is too large'
              }`,
            ),
          );
        }
        next();
      }
    } else if (req.file) {
      const fileData = req.file;
      if (fileData.size > 5000000) return next(new HttpException(401, `${fileData.fieldname} is too large`));
      next();
    } else {
      next(new HttpException(500, 'file needed'));
    }
  } catch (error) {
    next(new HttpException(500, error));
  }
};

export default fileMiddleware;
