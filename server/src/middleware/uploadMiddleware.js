import multer from 'multer';

// In-memory buffer storage for safe processing
const storage = multer.memoryStorage();

const allowedExtensions = ['.pdf', '.docx', '.pptx', '.txt'];
const allowedMimes = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'application/octet-stream' // some browsers report octet-stream for docx/pptx
];

export const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024 // 15 MB limit
  },
  fileFilter: (req, file, cb) => {
    const filename = file.originalname.toLowerCase();
    const hasValidExt = allowedExtensions.some(ext => filename.endsWith(ext));
    if (hasValidExt || allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Please upload a PDF, DOCX, PPTX, or TXT file.'));
    }
  }
});
