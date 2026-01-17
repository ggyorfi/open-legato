import { PdfViewer } from "./components/PdfViewer"
import "./App.css"
import { useState } from "react"
import { TopToolbar } from "./components/TopToolbar"

function App() {
  const [pdfPath, setPdfPath] = useState<string>()

  return (
    <>
      <TopToolbar pdfPath={pdfPath} onOpenPdf={setPdfPath} />
      <PdfViewer pdfPath={pdfPath} scale={1.5} />
    </>
  )
}

export default App
