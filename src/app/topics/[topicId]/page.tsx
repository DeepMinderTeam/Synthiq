 // 해당 주제의 논문 리스트 (ex: "AI 관련 논문")
 // 논문 추가하기
 
'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
  LineChart, Line
} from 'recharts'

// ✅ 막대그래프: 월별 학습 시간(시간 단위)
const barData = [
  { month: '3월', hours: 12 },
  { month: '4월', hours: 18 },
  { month: '5월', hours: 26 },
  { month: '6월', hours: 30 },
  { month: '7월', hours: 42 },
]

// ✅ 원형그래프: 퀴즈 정답률 분포
const pieData = [
  { name: '정답', value: 70 },
  { name: '오답', value: 20 },
  { name: '부분정답', value: 10 },
]
const COLORS = ['#00C49F', '#FF8042', '#FFBB28']

// ✅ 선형그래프: 주차별 학습 진도율(%)
const lineData = [
  { week: '1주차', progress: 10 },
  { week: '2주차', progress: 25 },
  { week: '3주차', progress: 45 },
  { week: '4주차', progress: 60 },
  { week: '5주차', progress: 80 },
  { week: '6주차', progress: 95 },
]

const papers = [
  { id: 1, title: '강아지에 관한 연구', date: '2025.06.05', summary: '강아지 관련 요약 내용입니다.' },
  { id: 2, title: '집단 간 네트워크 분석', date: '2025.06.10', summary: '네트워크 분석 관련 요약 내용입니다.' },
  { id: 3, title: 'AI 기반 분석', date: '2025.07.01', summary: '포유류 AI 분석 관련 요약 내용입니다.' },
]

export default function TopicDetailPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <header className="flex items-center justify-between px-4 py-2 border-b bg-white">
        <div className="text-2xl font-bold">로고 DeepMinder</div>
        <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 font-semibold">
          논문 추가하기
        </button>
      </header>

      <div className="px-4 py-3 text-lg font-semibold">검색창</div>

      {/* 그래프 영역 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-100">
        {/* ✅ 막대그래프: 월별 학습 시간 */}
        <div className="bg-white p-4 rounded shadow flex flex-col items-center">
          <h2 className="font-bold mb-2">월별 학습 시간</h2>
          <BarChart width={300} height={200} data={barData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="hours" fill="#8884d8" />
          </BarChart>
        </div>

        {/* ✅ 원형그래프: 퀴즈 정답률 */}
        <div className="bg-white p-4 rounded shadow flex flex-col items-center">
          <h2 className="font-bold mb-2">퀴즈 정답률</h2>
          <PieChart width={300} height={200}>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </div>

        {/* ✅ 선형그래프: 주차별 학습 진도율 */}
        <div className="bg-white p-4 rounded shadow flex flex-col items-center">
          <h2 className="font-bold mb-2">주차별 학습 진도율</h2>
          <LineChart width={300} height={200} data={lineData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="progress" stroke="#82ca9d" />
          </LineChart>
        </div>
      </div>

      {/* 논문 리스트 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 px-4">
        {papers.map(paper => (
          <div key={paper.id} className="bg-white rounded shadow p-4">
            <div className="font-bold mb-2">{paper.title}</div>
            <div className="text-sm text-gray-600 mb-2">{paper.summary}</div>
            <div className="text-xs text-gray-400">마지막으로 열어본 날짜 {paper.date}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
