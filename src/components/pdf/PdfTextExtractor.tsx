import React, { useRef, useState } from 'react';

// PaperContent 타입 (src/models/paper_contents.tsx 참고)
export interface PaperContent {
  content_id?: number; // 서버에서 할당
  content_paper_id?: number; // 서버에서 할당
  content_type?: string;
  content_index: number;
  content_text: string;
}

// PDF에서 문단 추출 함수 (동적 import 사용)
async function extractParagraphsFromPdf(file: File): Promise<string[]> {
  // 동적으로 pdfjs-dist import
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf')
  
  // pdfjs worker 설정
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  let fullText = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items.map((item: any) => item.str).join(' ')
    fullText += pageText + '\n\n'
  }

  // 문단별로 분리 (빈 줄 기준)
  return fullText
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 10)
}

export default function PdfTextExtractor() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [contents, setContents] = useState<PaperContent[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setContents([]);

    try {
      const paragraphs = await extractParagraphsFromPdf(file);

      // PaperContent 객체 배열로 변환
      const paperContents: PaperContent[] = paragraphs.map((text, idx) => ({
        content_index: idx + 1,
        content_text: text,
      }));

      setContents(paperContents);
    } catch (error) {
      console.error('PDF 추출 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="application/pdf"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      {loading && <div>PDF에서 텍스트 추출 중...</div>}
      <ul>
        {contents.map((c, idx) => (
          <li key={idx} style={{ marginBottom: 16, background: '#f5f5f5', padding: 8 }}>
            <b>문단 {c.content_index}</b>
            <div>{c.content_text}</div>
          </li>
        ))}
      </ul>
    </div>
  );
} 