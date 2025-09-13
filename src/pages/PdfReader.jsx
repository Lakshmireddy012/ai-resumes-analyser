import React, { useState } from "react";
import * as pdfjsLib from "pdfjs-dist/build/pdf";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

const PdfReader = () => {
  const [text, setText] = useState("");

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const fileReader = new FileReader();
    fileReader.onload = async function () {
      const typedArray = new Uint8Array(this.result);

      try {
        const pdf = await pdfjsLib.getDocument(typedArray).promise;
        let fullText = "";

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items.map((item) => item.str).join(" ");
          fullText += pageText + "\n\n";
        }

        setText(fullText);
      } catch (err) {
        console.error("Error reading PDF:", err);
      }
    };

    fileReader.readAsArrayBuffer(file);
  };

  return (
    <div>
      <h2>PDF Reader</h2>
      <input type="file" accept="application/pdf" onChange={handleFileUpload} />
      <pre style={{ whiteSpace: "pre-wrap", marginTop: "1rem" }}>{text}</pre>
    </div>
  );
};

export default PdfReader;
