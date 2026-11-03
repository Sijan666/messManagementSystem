import jwt from 'jsonwebtoken';

export const generateToken = (userId, role) => {
  const secret = process.env.JWT_SECRET_ACCESS || 'tintinatintin';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign({ id: userId, role }, secret, {
    expiresIn
  });
};
