# 🧠 Teachable Machine

A modern, user-friendly, and customizable Teachable Machine-like web application for training image classifiers directly in the browser using Random Forest Classifiers.


---

## 🚀 Features

- 📸 Upload images by class
- 🏋️ Train a custom image classification model in-browser
- 🔮 Predict results in real-time from uploaded test images
- 💅 Beautiful UI with Google-inspired design system using Tailwind CSS v4.1
- ⚡ Super-fast build and development using Vite
- 🔁 Built-in reset and retrain flow (optional toggle)

---

## 🧰 Tech Stack

- **Frontend**: React, Vite
- **Styling**: Tailwind CSS 4.1
- **ML Engine**: TensorFlow.js
- **Icons**: React Icons (e.g., Lucide, FontAwesome)
- **Animations**: AOS (Animate on Scroll), Framer Motion

---

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/your-username/teachable-machine-clone.git
cd teachable-machine-clone

# Install dependencies
npm install

# Start development server
npm run dev
```

---

## 📁 Project Structure

```
├── public/                 # Static assets
├── src/
│   ├── components/         # Reusable UI components
│   ├── utils/              # Helper functions and model logic
│   ├── App.jsx             # Main app layout
│   ├── main.jsx            # Vite entry point
│   └── index.css           # Tailwind base + custom variables
├── app.css                 # Extended theme and component-level styles
├── package.json            # Project metadata and scripts
├── vite.config.js          # Vite configuration
└── README.md               # This file
```

---

## 🧪 How It Works

1. **Upload**: Users add images grouped by class labels.
2. **Train**: TensorFlow.js uses the MobileNet feature extractor and a custom classifier.
3. **Predict**: Users test their model with new images to see predictions.

---

## 🖼️ UI Sections

- **Upload Section** – Drag-and-drop or file input grouped by class
- **Train Section** – Start training after uploading data
- **Predict Section** – Upload and predict on new images
- **Optional Reset** – Clear model and data (can be removed for production)

---

## 🛠 Customization

To tweak the design system, update the CSS variables in `index.css`:

```css
:root {
  --bg-light: #f9fafb;
  --text-main: #1f2937;
  --accent: #4f46e5;
  ...
}
```

To extend Tailwind configuration, edit `tailwind.config.js`.

---

## 🌐 Live Demo

> Coming soon! Deploy on [Vercel](https://vercel.com/) / [Netlify](https://netlify.com/) / GitHub Pages

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push and open a pull request

---

## 📄 License

[MIT](./LICENSE)

---

## 🙌 Credits

Inspired by [Teachable Machine by Google](https://teachablemachine.withgoogle.com/)
