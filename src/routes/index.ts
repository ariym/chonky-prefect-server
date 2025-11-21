import express, { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import asyncHandler from '../middleware/async-handler';

const router = express.Router();

interface ChonkyFile {
  id: string;
  name: string;
  isDir: boolean;
  size?: number;
  modDate?: Date;
}

/**
 * GET /files - List files in a directory
 * Query params:
 *   - path: directory path (optional, defaults to process.cwd())
 */
router.get('/files', asyncHandler(async (req: Request, res: Response) => {
  const dirPath = req.query.path as string || process.cwd();
  
  // Resolve and validate the path
  const resolvedPath = path.resolve(dirPath);
  
  console.log("trying to access",resolvedPath)
  
  // Basic security: ensure path exists and is accessible
  try {
    const stats = await fs.stat(resolvedPath);
    
    if (!stats.isDirectory()) {
      return res.status(400).json({ error: 'Path is not a directory' });
    }
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'Directory not found' });
    }
    throw error;
  }

  // Read directory contents
  const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
  
  const files: ChonkyFile[] = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(resolvedPath, entry.name);
      const stats = await fs.stat(fullPath);
      
      return {
        id: fullPath,
        name: entry.name,
        isDir: entry.isDirectory(),
        size: entry.isFile() ? stats.size : undefined,
        modDate: stats.mtime,
      };
    })
  );

  // Sort: directories first, then by name
  files.sort((a, b) => {
    if (a.isDir && !b.isDir) return -1;
    if (!a.isDir && b.isDir) return 1;
    return a.name.localeCompare(b.name);
  });

  res.json(files);
}));

/**
 * GET /file - Get file metadata or contents
 * Query params:
 *   - path: file path (required)
 *   - content: if 'true', returns file contents instead of metadata
 */
router.get('/file', asyncHandler(async (req: Request, res: Response) => {
  const filePath = req.query.path as string;
  
  if (!filePath) {
    return res.status(400).json({ error: 'Path parameter is required' });
  }

  const resolvedPath = path.resolve(filePath);
  
  try {
    const stats = await fs.stat(resolvedPath);
    
    if (stats.isDirectory()) {
      return res.status(400).json({ error: 'Path is a directory, use /files endpoint' });
    }

    const returnContent = req.query.content === 'true';
    
    if (returnContent) {
      // Return file contents
      const content = await fs.readFile(resolvedPath, 'utf-8');
      res.json({ 
        path: resolvedPath,
        name: path.basename(resolvedPath),
        content,
        size: stats.size,
        modDate: stats.mtime,
      });
    } else {
      // Return file metadata
      res.json({
        id: resolvedPath,
        name: path.basename(resolvedPath),
        isDir: false,
        size: stats.size,
        modDate: stats.mtime,
        created: stats.birthtime,
      });
    }
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'File not found' });
    }
    throw error;
  }
}));

/**
 * POST /files - Create a new file or directory
 * Body: { path: string, isDir?: boolean, content?: string }
 */
router.post('/files', asyncHandler(async (req: Request, res: Response) => {
  const { path: filePath, isDir = false, content = '' } = req.body;
  
  if (!filePath) {
    return res.status(400).json({ error: 'Path is required' });
  }

  const resolvedPath = path.resolve(filePath);
  
  try {
    if (isDir) {
      await fs.mkdir(resolvedPath, { recursive: true });
    } else {
      await fs.writeFile(resolvedPath, content, 'utf-8');
    }
    
    const stats = await fs.stat(resolvedPath);
    res.status(201).json({
      id: resolvedPath,
      name: path.basename(resolvedPath),
      isDir: stats.isDirectory(),
      size: stats.isFile() ? stats.size : undefined,
      modDate: stats.mtime,
    });
  } catch (error: any) {
    if (error.code === 'EEXIST') {
      return res.status(409).json({ error: 'File or directory already exists' });
    }
    throw error;
  }
}));

/**
 * DELETE /file - Delete a file or directory
 * Query params:
 *   - path: file/directory path (required)
 */
router.delete('/file', asyncHandler(async (req: Request, res: Response) => {
  const filePath = req.query.path as string;
  
  if (!filePath) {
    return res.status(400).json({ error: 'Path parameter is required' });
  }

  const resolvedPath = path.resolve(filePath);
  
  try {
    const stats = await fs.stat(resolvedPath);
    
    if (stats.isDirectory()) {
      await fs.rmdir(resolvedPath, { recursive: true });
    } else {
      await fs.unlink(resolvedPath);
    }
    
    res.status(200).json({ message: 'File or directory deleted successfully' });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'File or directory not found' });
    }
    throw error;
  }
}));

/**
 * PUT /file - Update file contents
 * Body: { path: string, content: string }
 */
router.put('/file', asyncHandler(async (req: Request, res: Response) => {
  const { path: filePath, content } = req.body;
  
  if (!filePath) {
    return res.status(400).json({ error: 'Path is required' });
  }

  if (content === undefined) {
    return res.status(400).json({ error: 'Content is required' });
  }

  const resolvedPath = path.resolve(filePath);
  
  try {
    const stats = await fs.stat(resolvedPath);
    
    if (stats.isDirectory()) {
      return res.status(400).json({ error: 'Cannot write content to a directory' });
    }

    await fs.writeFile(resolvedPath, content, 'utf-8');
    
    const newStats = await fs.stat(resolvedPath);
    res.json({
      id: resolvedPath,
      name: path.basename(resolvedPath),
      isDir: false,
      size: newStats.size,
      modDate: newStats.mtime,
    });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'File not found' });
    }
    throw error;
  }
}));

export default router;