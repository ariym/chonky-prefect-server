import fs from 'fs';
import path from 'path';
import videoExtensions from 'video-extensions';

type file = {
    path: string;
    size: number;
    timeCreated: string;
    timeModified: string;
}

const extensions = new Set(videoExtensions);

export function recursivelyAddDirectoryContents(dirPath, fileSet = new Set(), fileList: file[] = []) {
    // Read the directory contents
    const fileNames: string[] = fs.readdirSync(dirPath);

    // Iterate through directory contents
    for (const fileName of fileNames) {
        const filePath = path.join(dirPath, fileName);

        // Get statistics about file (is it a file or directory?)
        const fileStats = fs.statSync(filePath);

        // If it's a directory, recursively add its contents
        if (fileStats.isDirectory()) {
            recursivelyAddDirectoryContents(filePath, fileSet, fileList);
        } else if (fileStats.isFile()) {
            // If it's a file and not a duplicate,
            // and if it's extension is included in video files,
            // add to the list
            if (
                !fileSet.has(filePath) //&& extensions.has(path.extname(filePath).slice(1).toLowerCase())
            ) {
                fileSet.add(filePath); // Add to the set to avoid duplicates
                fileList.push({
                    path: filePath,
                    size: fileStats.size,
                    timeCreated: String(fileStats.birthtime),
                    timeModified: String(fileStats.mtime),
                }); // Add to the final file list
            }
        }
    }

    return fileList;
}
