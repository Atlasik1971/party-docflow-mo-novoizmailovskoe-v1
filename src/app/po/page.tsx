"use client";

import { useState } from "react";

export default function POPage() {
  const [showForm, setShowForm] = useState(false);
  const [questions, setQuestions] = useState([{ id: 1 }]);

  const addQuestion = () => {
    setQuestions((prev) => [...prev, { id: prev.length + 1 }]);
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
        <div className="mt-6 rounded-2xl border bg-white p-6">
          <h2 className="text-2xl font-semibold">
            Создание протокола общего собрания ПО
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Номер ПО
              </label>
              <input
                type="text"
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
                className="w-full rounded-xl border px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Место проведения
              </label>
              <input
                type="text"
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
                className="w-full rounded-xl border px-4 py-3"
                placeholder="Например: Петрова А.А."
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium">
                Приглашённые
              </label>
              <textarea
                className="w-full rounded-xl border px-4 py-3"
                rows={4}
                placeholder="Укажи приглашённых лиц, если они есть"
              />
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
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
              {questions.map((question) => (
                <div key={question.id} className="rounded-xl border bg-white p-4">
                  <p className="font-medium">Вопрос {question.id}</p>

                  <div className="mt-4 grid gap-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Формулировка вопроса
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-xl border px-4 py-3"
                        placeholder="Например: Об утверждении плана работы ПО"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Тезисы / комментарий пользователя
                      </label>
                      <textarea
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
                        className="w-full rounded-xl border px-4 py-3"
                        placeholder="Например: Секретарь ПО"
                      />
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                      >
                        Предложить суть вопроса
                      </button>

                      <button
                        type="button"
                        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium"
                      >
                        Предложить решение
                      </button>

                      <button
                        type="button"
                        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium"
                      >
                        Предложить полный блок
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}