import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

// Lazy initialization of Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

/**
 * AI-Powered Excel Grade Scanner Endpoint
 * Uses Gemini 3.8-flash to analyze tabular layout, locate student names,
 * identify all grade/score columns, and extract scores for existing students.
 */
app.post('/api/ai-scan-grades', async (req, res) => {
  try {
    const { rows, students } = req.body;

    if (!rows || !Array.isArray(rows) || rows.length < 2) {
      return res.status(400).json({ message: 'Dữ liệu hàng Excel không hợp lệ.' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        message: 'Chưa cấu hình GEMINI_API_KEY trên hệ thống máy chủ.',
      });
    }

    const prompt = `Bạn là chuyên gia phân tích dữ liệu bảng điểm học sinh tại Việt Nam (VNedu, SMAS, VietSchool, Excel giáo viên).
Dưới đây là các hàng dữ liệu đầu tiên trích xuất từ file Excel điểm:
${JSON.stringify(rows.slice(0, 30))}

Danh sách học sinh hiện có trong lớp:
${JSON.stringify(students || [])}

Nhiệm vụ của bạn:
1. Nhận diện dòng tiêu đề (header) của bảng dữ liệu (có thể ở dòng 0, 1, 2... đến dòng 15 do có phần tiêu đề trường/sở ở trên).
2. Nhận diện cột Tên học sinh (có thể là một cột "Họ và tên" duy nhất, hoặc 2 cột riêng biệt "Họ và tên đệm" và "Tên" cần ghép lại).
3. Nhận diện TẤT CẢ CÁC CỘT ĐIỂM (Ví dụ: Toán, Ngữ văn, Tiếng Anh, KHTN, Lịch sử, Địa lý, GDCD, Tin học, Công nghệ, Điểm 15p, Giữa kỳ, Cuối kỳ, Điểm TB...).
   - Bỏ qua các cột không phải điểm như: STT, SBD, Mã học sinh, Ngày sinh, Nơi sinh, Giới tính, Dân tộc, Lớp, Ghi chú.
4. Đối chiếu tên học sinh trong bảng với danh sách học sinh hiện có trong lớp (so khớp linh hoạt theo tiếng Việt, bỏ qua viết hoa/thường hay khoảng trắng thừa).
5. Trích xuất điểm của từng học sinh theo từng môn học đã tìm thấy (điểm là số từ 0 đến 10, nếu trống hoặc dấu gạch ngang thì để null).

Hãy trả về DUY NHẤT một JSON theo cấu trúc sau (không kèm markdown):
{
  "subjects": ["Toán", "Ngữ văn", "Tiếng Anh", ...],
  "results": [
    {
      "studentId": "id_hoc_sinh_neu_khop_duoc",
      "studentName": "Họ và tên đầy đủ trong file",
      "matched": true,
      "scores": {
        "Toán": 8.5,
        "Ngữ văn": 7.0
      }
    }
  ],
  "unmatchedNames": ["Tên học sinh không tìm thấy trong danh sách lớp"]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text?.trim() || '{}';
    const parsedData = JSON.parse(responseText);

    return res.json(parsedData);
  } catch (err: any) {
    console.error('Error in /api/ai-scan-grades:', err);
    return res.status(500).json({
      message: err.message || 'Lỗi xử lý quét AI',
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
