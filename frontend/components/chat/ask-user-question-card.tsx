"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircleQuestion,
  Check,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import type { ToolUse } from "@/types/chat";

interface QuestionOption {
  label: string;
  description: string;
}

interface Question {
  question: string;
  header: string;
  options: QuestionOption[];
  multiSelect?: boolean;
}

interface AskUserQuestionCardProps {
  tool: ToolUse;
}

interface CollectedAnswer {
  questionHeader: string;
  answer: string;
}

export function AskUserQuestionCard({ tool }: AskUserQuestionCardProps) {
  const questions: Question[] = Array.isArray(tool.input?.questions)
    ? (tool.input.questions as Question[])
    : [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<number, CollectedAnswer>>(
    new Map()
  );
  const [allSubmitted, setAllSubmitted] = useState(false);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back

  const sendMessage = useStore((s) => s.sendMessage);
  const activeSessionId = useStore((s) => s.activeSessionId);
  const currentProject = useStore((s) => s.currentProject);

  const isComplete = tool.isComplete;
  const isSingleQuestion = questions.length === 1;

  const handleAnswerCollected = useCallback(
    (index: number, answer: string, header: string) => {
      setAnswers((prev) => {
        const next = new Map(prev);
        next.set(index, { questionHeader: header, answer });
        return next;
      });

      if (index < questions.length - 1) {
        // Advance to next question
        setDirection(1);
        setCurrentIndex(index + 1);
      } else {
        // Last question answered — send combined response
        setAllSubmitted(true);

        if (!activeSessionId || !currentProject) return;

        // Build combined answer
        const allAnswers = new Map(answers);
        allAnswers.set(index, { questionHeader: header, answer });

        let combined: string;
        if (questions.length === 1) {
          combined = answer;
        } else {
          const parts: string[] = [];
          for (let i = 0; i < questions.length; i++) {
            const a = allAnswers.get(i);
            if (a) {
              parts.push(`${a.questionHeader}: ${a.answer}`);
            }
          }
          combined = parts.join("\n");
        }

        sendMessage(combined, currentProject.id, activeSessionId);
      }
    },
    [questions.length, answers, activeSessionId, currentProject, sendMessage]
  );

  const handleBack = useCallback(() => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  if (questions.length === 0) return null;

  // If tool is complete, show summary of all answered questions
  if (isComplete || allSubmitted) {
    return (
      <motion.div
        className="my-2 rounded-lg border border-border bg-tool-bg overflow-hidden"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.15 }}
      >
        {questions.map((question, index) => {
          const savedAnswer = answers.get(index);
          const previousAnswer = tool.output
            ? parseAnswerForQuestion(tool.output, question.header, index, questions.length)
            : null;
          const displayAnswer = savedAnswer?.answer || previousAnswer;

          return (
            <div
              key={index}
              className={cn(
                "px-3 py-2.5",
                index < questions.length - 1 && "border-b border-border"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <Check size={12} className="text-success shrink-0" />
                <Badge variant="accent" className="text-[11px]">
                  {question.header}
                </Badge>
              </div>
              <p className="text-xs text-text-secondary ml-5">
                {question.question}
              </p>
              {displayAnswer && (
                <p className="text-xs text-text-primary font-medium ml-5 mt-1">
                  {displayAnswer}
                </p>
              )}
            </div>
          );
        })}
      </motion.div>
    );
  }

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 80 : -80,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -80 : 80,
      opacity: 0,
    }),
  };

  return (
    <motion.div
      className="my-2 rounded-lg border border-border bg-tool-bg overflow-hidden"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15 }}
    >
      {/* Progress bar + navigation (only for multi-question) */}
      {!isSingleQuestion && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <button
              onClick={handleBack}
              disabled={currentIndex === 0}
              className={cn(
                "p-0.5 rounded transition-colors",
                currentIndex > 0
                  ? "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary cursor-pointer"
                  : "text-text-tertiary/30 cursor-not-allowed"
              )}
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-[11px] text-text-tertiary font-medium">
              Question {currentIndex + 1} of {questions.length}
            </span>
          </div>

          {/* Dot indicators */}
          <div className="flex items-center gap-1.5">
            {questions.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all duration-200",
                  i === currentIndex
                    ? "bg-accent w-4"
                    : answers.has(i)
                      ? "bg-success"
                      : "bg-text-tertiary/30"
                )}
              />
            ))}
          </div>
        </div>
      )}

      {/* Slideshow content */}
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <QuestionSlide
              question={questions[currentIndex]}
              tool={tool}
              existingAnswer={answers.get(currentIndex)?.answer}
              onAnswer={(answer) =>
                handleAnswerCollected(
                  currentIndex,
                  answer,
                  questions[currentIndex].header
                )
              }
              isLastQuestion={currentIndex === questions.length - 1}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function QuestionSlide({
  question,
  tool,
  existingAnswer,
  onAnswer,
  isLastQuestion,
}: {
  question: Question;
  tool: ToolUse;
  existingAnswer?: string;
  onAnswer: (answer: string) => void;
  isLastQuestion: boolean;
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(() => {
    if (existingAnswer) {
      const idx = question.options.findIndex((o) => o.label === existingAnswer);
      return idx >= 0 ? idx : null;
    }
    return null;
  });
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(() => {
    if (existingAnswer && question.multiSelect) {
      const labels = existingAnswer.split(", ");
      const indices = new Set<number>();
      labels.forEach((label) => {
        const idx = question.options.findIndex((o) => o.label === label);
        if (idx >= 0) indices.add(idx);
      });
      return indices;
    }
    return new Set();
  });
  const [otherText, setOtherText] = useState("");
  const [showOther, setShowOther] = useState(() => {
    if (existingAnswer) {
      const matchesOption = question.options.some(
        (o) => o.label === existingAnswer
      );
      return !matchesOption;
    }
    return false;
  });

  const isMultiSelect = question.multiSelect === true;
  const isComplete = tool.isComplete;

  const handleSelect = (idx: number) => {
    if (isComplete) return;

    if (isMultiSelect) {
      setSelectedIndices((prev) => {
        const next = new Set(prev);
        if (next.has(idx)) next.delete(idx);
        else next.add(idx);
        return next;
      });
      setShowOther(false);
    } else {
      setSelectedIndex(idx);
      setShowOther(false);
    }
  };

  const handleOther = () => {
    if (isComplete) return;
    setSelectedIndex(null);
    setSelectedIndices(new Set());
    setShowOther(true);
  };

  const handleSubmit = () => {
    let answer: string;
    if (showOther && otherText.trim()) {
      answer = otherText.trim();
    } else if (isMultiSelect && selectedIndices.size > 0) {
      const labels = Array.from(selectedIndices).map(
        (i) => question.options[i].label
      );
      answer = labels.join(", ");
    } else if (selectedIndex !== null) {
      answer = question.options[selectedIndex].label;
    } else {
      return;
    }

    onAnswer(answer);
  };

  const hasSelection = isMultiSelect
    ? selectedIndices.size > 0
    : selectedIndex !== null || (showOther && otherText.trim().length > 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <MessageCircleQuestion size={14} className="text-accent shrink-0" />
        <Badge variant="accent" className="text-[11px]">
          {question.header}
        </Badge>
      </div>

      {/* Question text */}
      <div className="px-3 pt-2.5 pb-2">
        <p className="text-sm text-text-primary leading-relaxed">
          {question.question}
        </p>
      </div>

      {/* Options */}
      <div className="px-2 pb-1">
        <AnimatePresence initial={false}>
          {question.options.map((option, idx) => {
            const isSelected = isMultiSelect
              ? selectedIndices.has(idx)
              : selectedIndex === idx;

            return (
              <motion.button
                key={idx}
                onClick={() => handleSelect(idx)}
                disabled={isComplete}
                className={cn(
                  "flex items-start gap-3 w-full px-3 py-2 rounded-md text-left transition-all",
                  "hover:bg-bg-tertiary/50",
                  isSelected && "bg-accent/8",
                  isComplete && "cursor-default hover:bg-transparent"
                )}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.12, delay: idx * 0.03 }}
              >
                {/* Radio / Checkbox indicator */}
                <div className="mt-0.5 shrink-0">
                  {isMultiSelect ? (
                    <div
                      className={cn(
                        "w-3.5 h-3.5 rounded-[3px] border transition-all flex items-center justify-center",
                        isSelected
                          ? "border-accent bg-accent"
                          : "border-text-tertiary"
                      )}
                    >
                      {isSelected && (
                        <Check
                          size={10}
                          className="text-bg-primary"
                          strokeWidth={3}
                        />
                      )}
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "w-3.5 h-3.5 rounded-full border transition-all flex items-center justify-center",
                        isSelected ? "border-accent" : "border-text-tertiary"
                      )}
                    >
                      {isSelected && (
                        <motion.div
                          className="w-2 h-2 rounded-full bg-accent"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 25,
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Label + Description */}
                <div className="flex-1 min-w-0">
                  <span
                    className={cn(
                      "text-xs font-medium block",
                      isSelected ? "text-text-primary" : "text-text-secondary"
                    )}
                  >
                    {option.label}
                  </span>
                  {option.description && (
                    <span className="text-[11px] text-text-tertiary leading-snug block mt-0.5">
                      {option.description}
                    </span>
                  )}
                </div>

                {/* Selection indicator */}
                {isSelected && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="shrink-0 mt-0.5"
                  >
                    <ChevronRight size={12} className="text-accent" />
                  </motion.div>
                )}
              </motion.button>
            );
          })}

          {/* Other option */}
          {!isComplete && (
            <motion.button
              onClick={handleOther}
              className={cn(
                "flex items-start gap-3 w-full px-3 py-2 rounded-md text-left transition-all",
                "hover:bg-bg-tertiary/50",
                showOther && "bg-accent/8"
              )}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.12,
                delay: question.options.length * 0.03,
              }}
            >
              <div className="mt-0.5 shrink-0">
                <div
                  className={cn(
                    "w-3.5 h-3.5 rounded-full border transition-all flex items-center justify-center",
                    showOther ? "border-accent" : "border-text-tertiary"
                  )}
                >
                  {showOther && (
                    <motion.div
                      className="w-2 h-2 rounded-full bg-accent"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 25,
                      }}
                    />
                  )}
                </div>
              </div>
              <span
                className={cn(
                  "text-xs font-medium",
                  showOther ? "text-text-primary" : "text-text-secondary"
                )}
              >
                Other
              </span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Other text input */}
        <AnimatePresence>
          {showOther && !isComplete && (
            <motion.div
              className="px-3 pb-2"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
            >
              <input
                type="text"
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && otherText.trim()) handleSubmit();
                }}
                placeholder="Type your answer..."
                className="w-full text-xs bg-bg-input border border-border rounded-md px-2.5 py-1.5 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-colors"
                autoFocus
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Submit / Next button */}
      {!isComplete && (
        <div className="px-3 pb-2.5">
          <motion.button
            onClick={handleSubmit}
            disabled={!hasSelection}
            className={cn(
              "w-full py-1.5 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5",
              hasSelection
                ? "bg-accent text-bg-primary hover:bg-accent-hover cursor-pointer"
                : "bg-bg-tertiary text-text-tertiary cursor-not-allowed"
            )}
            whileTap={hasSelection ? { scale: 0.98 } : {}}
          >
            {isLastQuestion ? (
              <>
                Submit
                <Check size={12} />
              </>
            ) : (
              <>
                Next
                <ArrowRight size={12} />
              </>
            )}
          </motion.button>
        </div>
      )}
    </div>
  );
}

function parseAnswerForQuestion(
  output: string,
  header: string,
  index: number,
  totalQuestions: number
): string | null {
  try {
    const parsed = JSON.parse(output);
    if (parsed?.answers) {
      const values = Object.values(parsed.answers) as string[];
      if (values[index]) return values[index];
      if (values.length > 0 && totalQuestions === 1) return values[0];
    }
  } catch {
    // Output might be a combined string with "Header: Answer" format
    const lines = output.trim().split("\n");
    for (const line of lines) {
      if (line.startsWith(`${header}:`)) {
        return line.slice(header.length + 1).trim();
      }
    }
    // Single question — return raw
    if (totalQuestions === 1 && output.trim()) return output.trim();
  }
  return null;
}
