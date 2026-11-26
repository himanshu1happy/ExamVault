# ExamVault – Smart Exam Preparation Platform

ExamVault is a full-stack web application designed to help students prepare for competitive examinations using previous year question papers (PYQs) and an AI-powered learning assistant.

Students can explore and download question papers, access solutions, interact with other learners, and ask an AI assistant to explain questions using **Retrieval-Augmented Generation (RAG)**.

## 🚀 Key Features

- **Previous Year Question Papers:** Browse, search, filter, and download exam papers.
- **AI-Powered RAG Assistant:** Ask questions about uploaded papers and get context-based explanations.
- **Question & Solution PDFs:** Separate question papers and official solutions for better learning.
- **User Authentication:** Secure registration, email OTP verification, login, and password reset.
- **Student Profiles:** Manage profile information and save favourite papers.
- **Community Interaction:** Like, dislike, and comment on papers.
- **Admin Dashboard:** Upload, update, delete, and manage question papers and solutions.
- **PDF Indexing:** Automatically process uploaded PDFs to make their content searchable by the AI assistant.
- **Email Integration:** Send verification and password-reset emails.

## 🧠 How RAG Works in ExamVault

One of the main features of ExamVault is its **Retrieval-Augmented Generation (RAG)** system.

Instead of asking an AI model to answer everything from its general knowledge, ExamVault retrieves relevant content from the uploaded question papers and solutions before generating a response.

### RAG Workflow

```text
       PDF Upload
            |
            v
    Text Extraction
       (pdf-parse)
            |
            v
     Smart Chunking
   (Questions & Sections)
            |
            v
    Gemini Embeddings
     (768 Dimensions)
            |
            v
    Store in MongoDB
            |
            |
     Student Asks a Question
            |
            v
     Generate Query Embedding
            |
            v
   Similarity-based Retrieval
            |
            v
   Retrieve Relevant Chunks
            |
            v
   Gemini 2.5 Flash + Context
            |
            v
       AI Response
```

### RAG Process Explained

**1. PDF Text Extraction**

When an admin uploads a question paper and its solution PDF, ExamVault extracts the text using `pdf-parse`.

**2. Smart Chunking**

The extracted text is divided into smaller meaningful chunks. The system identifies question numbers, sections, and headings to preserve the relationship between questions and their content.

**3. Generate Embeddings**

Each chunk is converted into a numerical vector using Google's Gemini Embedding model (`gemini-embedding-001`) with 768 dimensions.

**4. Store in MongoDB**

The text chunks and their corresponding embeddings are stored in MongoDB along with metadata such as paper ID, question number, section, and page number.

**5. Semantic Search**

When a student asks a question, the system converts the query into an embedding and compares it with stored embeddings to find the most relevant content.

**6. Generate AI Response**

The retrieved content is passed as context to Gemini 2.5 Flash, which generates an explanation based on the available paper content.

When relevant official solution content is available, the assistant uses it to explain the answer. Otherwise, it can respond as a general AI tutor.

**Why RAG?**

- Provides answers based on uploaded study material.
- Helps students understand specific questions and solutions.
- Reduces reliance on the AI model's general knowledge alone.
- Makes large collections of exam papers searchable through natural language.

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| HTML, CSS, JavaScript | Frontend |
| Node.js | Backend runtime |
| Express.js | Backend framework and APIs |
| MongoDB | Database and vector storage |
| Mongoose | Database modelling |
| Google Gemini API | AI responses and embeddings |
| pdf-parse | PDF text extraction |
| Cloudinary | File and image storage |
| Brevo | Email delivery |
| JWT & bcrypt | Authentication and password security |

## ⚙️ Project Setup

**1. Clone the repository**

```bash
git clone https://github.com/himanshu1happy/ExamVault.git
cd ExamVault
```

**2. Install dependencies**

```bash
npm install
```

**3. Configure environment variables**

Create a `.env` file and configure the credentials required by the application, including:

- MongoDB connection URI
- JWT secret
- Gemini API key
- Cloudinary credentials
- Brevo email credentials
- Application URL

**4. Run the application**

Use the start command configured in the project's `package.json`.

## 🔮 Future Improvements

- OCR support for scanned question papers.
- More advanced semantic retrieval and filtering.
- Improved answer citations with PDF page references.
- Support for additional competitive examinations.

## 👨‍💻 Developer

**Himanshu**

- GitHub: [@himanshu1happy](https://github.com/himanshu1happy)
- Project: [ExamVault](https://github.com/himanshu1happy/ExamVault)

---

*ExamVault – Making exam preparation smarter with AI.*