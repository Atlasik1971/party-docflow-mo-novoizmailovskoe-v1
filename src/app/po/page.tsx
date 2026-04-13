"use client";

import { useState } from "react";

type Question = {
  id: number;
  title: string;
  notes: string;
  speaker: string;
  essence: string;
  decision: string;
  votesFor: string;
  votesAgainst: string;
  abstained: string;
  votesEditedManually: boolean;
};

type FormData = {
  poNumber: string;
  meetingDate: string;
  meetingPlace: string;
  protocolNumber: string;
  membersOnRegister: string;
  membersPresent: string;
  chairperson: string;
  secretary: string;
  invited: string;
};

export default function POPage() {
  const [showForm, setShowForm] = useState(false);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    poNumber: "",
    meetingDate: "",
    meetingPlace: "",
    protocolNumber: "",
    membersOnRegister: "",
    membersPresent: "",
    chairperson: "",
    secretary: "",
    invited: "",
  });

  const [questions, setQuestions] = useState<Question[]>([
    {
      id: 1,
      title: "",
      notes: "",
      speaker: "",
      essence: "",
      decision: "",
      votesFor: "",
      votesAgainst: "0",
      abstained: "0",
      votesEditedManually: false,
    },
  ]);

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (field === "membersPresent") {
      setQuestions((prev) =>
        prev.map((question) =>
          question.votesEditedManually
            ? question
            : {
                ...question,
                votesFor: value,
                votesAgainst: "0",
                abstained: "0",
              }
        )
      );
    }
  };

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: Date.now(),
        title: "",
        notes: "",
        speaker: "",
        essence: "",
        decision: "",
        votesFor: formData.membersPresent || "",
        votesAgainst: "0",
        abstained: "0",
        votesEditedManually: false,
      },
    ]);
  };

  const removeQuestion = (id: number) => {
    setQuestions((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((question) => question.id !== id);
    });
  };

  const updateQuestion = (
    id: number,
    field: keyof Omit<Question, "id" | "votesEditedManually">,
    value: string
  ) => {
    setQuestions((prev) =>
      prev.map((question) =>
        question.id === id ? { ...question, [field]: value } : question
      )
    );
  };

  const updateVotes = (
    id: number,
    field: "votesFor" | "votesAgainst" | "abstained",
    value: string
  ) => {
    setQuestions((prev) =>
      prev.map((question) =>
        question.id === id
          ? {
              ...question,
              [field]: value,
              votesEditedManually: true,
            }
          : question
      )
    );
  };

  const buildEssenceText = (question: Question) => {
    const speakerText = question.speaker
      ? `Информацию ${question.speaker}`
      : "Информацию по вопросу";

    const titleText = question.title
      ? ` по вопросу «${question.title}»`
      : "";

    const notesText = question.notes ? ` ${question.notes.trim()}` : "";

    return `${speakerText}${titleText}.${notesText}`.trim();
  };

  const buildDecisionText = (question: Question) => {
    const titleText = question.title || "рассматриваемому вопросу";

    const noteSentence = question.notes
      ? `2. ${question.notes.trim().charAt(0).toUpperCase()}${question.notes
          .trim()
          .slice(1)}.`
      : `2. Организовать дальнейшую работу по вопросу «${titleText}» в установленном порядке.`;

    return [
      `1. Информацию по вопросу «${titleText}» принять к сведению.`,
      noteSentence,
      `3. Контроль за исполнением настоящего решения возложить на Секретаря ПО.`,
    ].join("\n");
  };

  const generateEssence = (question: Question) => {
    const essence = buildEssenceText(question);

    setQuestions((prev) =>
      prev.map((item) =>
        item.id === question.id ? { ...item, essence } : item
      )
    );
  };

  const generateDecision = (question: Question) => {
    const decision = buildDecisionText(question);

    setQuestions((prev) =>
      prev.map((item) =>
        item.id === question.id ? { ...item, decision } : item
      )
    );
  };

  const generateFullBlock = (question: Question) => {
    const essence = buildEssenceText(question);
    const decision = buildDecisionText(question);

    setQuestions((prev) =>
      prev.map((item) =>
        item.id === question.id ? { ...item, essence, decision } : item
      )
    );
  };

  const protocolDraft = `
ПРОТОКОЛ № ${formData.protocolNumber || "___"}
общего собрания ПО ${formData.poNumber || "___"}

Дата проведения: ${formData.meetingDate || "___"}
Место проведения: ${formData.meetingPlace || "___"}

Число членов Партии на учёте: ${formData.membersOnRegister || "___"}
Число присутствующих: ${formData.membersPresent || "___"}

Председатель собрания: ${formData.chairperson || "___"}
Секретарь собрания: ${formData.secretary || "___"}

Приглашённые:
${formData.invited || "___"}

ПОВЕСТКА ДНЯ:
${questions
  .map(
    (question, index) =>
      `${index + 1}. ${question.title || "Формулировка вопроса не указана"}`
  )
  .join("\n")}

${questions
  .map(
    (question, index) => `
ВОПРОС ${index + 1}
${question.title || "Формулировка вопроса не указана"}

СЛУШАЛИ:
${question.essence || "Текст пока не сформирован."}

РЕШИЛИ:
${question.decision || "Проект решения пока не сформирован."}

ГОЛОСОВАЛИ:
за — ${question.votesFor || "___"}
против — ${question.votesAgainst || "___"}
воздержались — ${question.abstained || "___"}
`
  )
  .join("\n")}
  `.trim();

  const copyDraft = async () => {
    await navigator.clipboard.writeText(protocolDraft);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <main className="min-h-screen bg-slate-50 p-10 text-slate-900">
      <h1 className="text-4xl font-bold">Блок ПО</h1>

      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="mt-6 rounded-xl bg-black px-5 py-3 text-white"
      >
        Создать протокол
      </button>

      {showForm && (
        <div className="mt-6 space-y-6">
          <div className="rounded-2xl border bg-white p-6">
            <h2 className="text-2xl font-semibold">
              Создание протокола общего собрания ПО
            </h2>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.3fr]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-xl font-semibold">Основные реквизиты</h3>

                <div className="mt-5 grid gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Номер ПО
                    </label>
                    <input
                      type="text"
                      value={formData.poNumber}
                      onChange={(e) =>
                        updateFormData("poNumber", e.target.value)
                      }
                      className="w-full rounded-xl border px-4 py-3"
                      placeholder="Например: № 1234"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Дата собрания
                    </label>
                    <input
                      type="date"
                      value={formData.meetingDate}
                      onChange={(e) =>
                        updateFormData("meetingDate", e.target.value)
                      }
                      className="w-full rounded-xl border px-4 py-3"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Место проведения
                    </label>
                    <input
                      type="text"
                      value={formData.meetingPlace}
                      onChange={(e) =>
                        updateFormData("meetingPlace", e.target.value)
                      }
                      className="w-full rounded-xl border px-4 py-3"
                      placeholder="Например: Санкт-Петербург"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Номер протокола
                    </label>
                    <input
                      type="text"
                      value={formData.protocolNumber}
                      onChange={(e) =>
                        updateFormData("protocolNumber", e.target.value)
                      }
                      className="w-full rounded-xl border px-4 py-3"
                      placeholder="Например: 1"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Количество членов на учёте
                    </label>
                    <input
                      type="number"
                      value={formData.membersOnRegister}
                      onChange={(e) =>
                        updateFormData("membersOnRegister", e.target.value)
                      }
                      className="w-full rounded-xl border px-4 py-3"
                      placeholder="Например: 18"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Количество присутствующих
                    </label>
                    <input
                      type="number"
                      value={formData.membersPresent}
                      onChange={(e) =>
                        updateFormData("membersPresent", e.target.value)
                      }
                      className="w-full rounded-xl border px-4 py-3"
                      placeholder="Например: 12"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Председатель собрания
                    </label>
                    <input
                      type="text"
                      value={formData.chairperson}
                      onChange={(e) =>
                        updateFormData("chairperson", e.target.value)
                      }
                      className="w-full rounded-xl border px-4 py-3"
                      placeholder="Например: Иванов И.И."
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Секретарь собрания
                    </label>
                    <input
                      type="text"
                      value={formData.secretary}
                      onChange={(e) =>
                        updateFormData("secretary", e.target.value)
                      }
                      className="w-full rounded-xl border px-4 py-3"
                      placeholder="Например: Петрова А.А."
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Приглашённые
                    </label>
                    <textarea
                      value={formData.invited}
                      onChange={(e) =>
                        updateFormData("invited", e.target.value)
                      }
                      className="w-full rounded-xl border px-4 py-3"
                      rows={6}
                      placeholder="Укажи приглашённых лиц, если они есть"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-xl font-semibold">Вопросы повестки</h3>

                  <button
                    type="button"
                    onClick={addQuestion}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium"
                  >
                    Добавить вопрос
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  {questions.map((question, index) => (
                    <div
                      key={question.id}
                      className="rounded-xl border bg-white p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <p className="font-medium">Вопрос {index + 1}</p>

                        {questions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeQuestion(question.id)}
                            className="rounded-xl border border-red-300 px-3 py-2 text-sm font-medium text-red-600"
                          >
                            Удалить вопрос
                          </button>
                        )}
                      </div>

                      <div className="mt-4 grid gap-4">
                        <div>
                          <label className="mb-2 block text-sm font-medium">
                            Формулировка вопроса
                          </label>
                          <input
                            type="text"
                            value={question.title}
                            onChange={(e) =>
                              updateQuestion(
                                question.id,
                                "title",
                                e.target.value
                              )
                            }
                            className="w-full rounded-xl border px-4 py-3"
                            placeholder="Например: Об утверждении плана работы ПО"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium">
                            Тезисы / комментарий пользователя
                          </label>
                          <textarea
                            value={question.notes}
                            onChange={(e) =>
                              updateQuestion(
                                question.id,
                                "notes",
                                e.target.value
                              )
                            }
                            className="w-full rounded-xl border px-4 py-3"
                            rows={3}
                            placeholder="Коротко опиши суть вопроса"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium">
                            Докладчик
                          </label>
                          <input
                            type="text"
                            value={question.speaker}
                            onChange={(e) =>
                              updateQuestion(
                                question.id,
                                "speaker",
                                e.target.value
                              )
                            }
                            className="w-full rounded-xl border px-4 py-3"
                            placeholder="Например: Секретарь ПО"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium">
                            Суть вопроса
                          </label>
                          <textarea
                            value={question.essence}
                            onChange={(e) =>
                              updateQuestion(
                                question.id,
                                "essence",
                                e.target.value
                              )
                            }
                            className="w-full rounded-xl border px-4 py-3"
                            rows={3}
                            placeholder="Здесь позже ИИ будет предлагать текст для блока СЛУШАЛИ"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium">
                            Проект решения
                          </label>
                          <textarea
                            value={question.decision}
                            onChange={(e) =>
                              updateQuestion(
                                question.id,
                                "decision",
                                e.target.value
                              )
                            }
                            className="w-full rounded-xl border px-4 py-3"
                            rows={4}
                            placeholder="Здесь позже ИИ будет предлагать текст для блока РЕШИЛИ"
                          />
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                          <div>
                            <label className="mb-2 block text-sm font-medium">
                              За
                            </label>
                            <input
                              type="number"
                              value={question.votesFor}
                              onChange={(e) =>
                                updateVotes(
                                  question.id,
                                  "votesFor",
                                  e.target.value
                                )
                              }
                              className="w-full rounded-xl border px-4 py-3"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium">
                              Против
                            </label>
                            <input
                              type="number"
                              value={question.votesAgainst}
                              onChange={(e) =>
                                updateVotes(
                                  question.id,
                                  "votesAgainst",
                                  e.target.value
                                )
                              }
                              className="w-full rounded-xl border px-4 py-3"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium">
                              Воздержались
                            </label>
                            <input
                              type="number"
                              value={question.abstained}
                              onChange={(e) =>
                                updateVotes(
                                  question.id,
                                  "abstained",
                                  e.target.value
                                )
                              }
                              className="w-full rounded-xl border px-4 py-3"
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => generateEssence(question)}
                            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                          >
                            Предложить суть вопроса
                          </button>

                          <button
                            type="button"
                            onClick={() => generateDecision(question)}
                            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium"
                          >
                            Предложить решение
                          </button>

                          <button
                            type="button"
                            onClick={() => generateFullBlock(question)}
                            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium"
                          >
                            Предложить полный блок
                          </button>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                            Черновик протокольного блока
                          </p>

                          <div className="mt-3 space-y-3 text-sm leading-6 text-slate-800">
                            <div>
                              <p className="font-semibold">СЛУШАЛИ:</p>
                              <p className="mt-1 whitespace-pre-line">
                                {question.essence ||
                                  "Текст пока не сформирован."}
                              </p>
                            </div>

                            <div>
                              <p className="font-semibold">РЕШИЛИ:</p>
                              <p className="mt-1 whitespace-pre-line">
                                {question.decision ||
                                  "Проект решения пока не сформирован."}
                              </p>
                            </div>

                            <div>
                              <p className="font-semibold">ГОЛОСОВАЛИ:</p>
                              <p className="mt-1 whitespace-pre-line">
                                {`за — ${question.votesFor || "___"}`}
                                {"\n"}
                                {`против — ${question.votesAgainst || "___"}`}
                                {"\n"}
                                {`воздержались — ${question.abstained || "___"}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold">Черновик всего протокола</h2>

              <button
                type="button"
                onClick={copyDraft}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              >
                {copied ? "Скопировано" : "Скопировать черновик"}
              </button>
            </div>

            <pre className="mt-6 whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-800">
              {protocolDraft}
            </pre>
          </div>
        </div>
      )}
    </main>
  );
}