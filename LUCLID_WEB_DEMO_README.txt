Luclid-ii v0.3.0 Browser AI

Run the portfolio with python3 -m http.server 8000 and open localhost:8000. Open Luclid-ii.exe and click Load AI Model.

Model: onnx-community/SmolLM2-135M-Instruct-ONNX, via Transformers.js CDN. Weights download on first use and may be hundreds of MB. WebGPU is preferred, WASM is the fallback. A current browser and adequate RAM are required. Internet is needed for the first load.

Privacy: messages are processed in the browser after the model loads. Model assets are fetched from Hugging Face / jsDelivr. Public GitHub API requests are read-only. No Google, LinkedIn, Ollama, or backend integrations.

Note: this is a small model with limited reasoning and possible hallucinations. Browser tests on target devices are still required.
