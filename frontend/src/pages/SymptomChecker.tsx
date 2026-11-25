
import React, { useState, useCallback } from 'react';
import Layout from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Textarea } from '../components/ui/Input';
import { useToast, Toast } from '../components/ui/Toast';

interface PredictionResult {
  disease: string;
  confidence: number;
  specialist: string;
  differentials: {
    disease: string;
    confidence: number;
  }[];
  model: string;
  low_confidence?: boolean;
  result_note?: string;
}

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:8000'
).replace(/\/+$/, '');

const EMERGENCY_KEYWORDS = [
  'chest pain',
  'heart attack',
  'stroke',
  'bleeding',
  'unconscious',
  'emergency',
  'difficulty breathing',
  'shortness of breath',
  'breathlessness',
  'slurred speech',
  'weakness of one body side',
  'one-sided weakness',
  'weakness on one side',
  'altered sensorium',
  'coma'
];

const containsEmergencyWarning = (text: string): boolean => {
  const normalized = text.toLowerCase();

  return EMERGENCY_KEYWORDS.some(keyword =>
    normalized.includes(keyword)
  );
};

const formatConfidence = (value: number): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 'N/A';
  }

  return `${(value * 100).toFixed(1)}%`;
};

export default function SymptomChecker() {
  const [description, setDescription] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [isEmergency, setIsEmergency] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [submittedSymptoms, setSubmittedSymptoms] = useState('');

  const navigate = useNavigate();
  const { toast, showToast, hideToast } = useToast();

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const text = e.target.value;
      setDescription(text);

      const combinedText = [text, ...selectedSymptoms].join(' ');
      setIsEmergency(containsEmergencyWarning(combinedText));
    },
    [selectedSymptoms]
  );

  const toggleSymptom = useCallback((symptom: string) => {
    setSelectedSymptoms(prev => {
      const updated = prev.includes(symptom)
        ? prev.filter(s => s !== symptom)
        : [...prev, symptom];

      setIsEmergency(
        containsEmergencyWarning(
          [description, ...updated].join(' ')
        )
      );

      return updated;
    });
  }, [description]);

  const executePrediction = useCallback(async () => {
    const symptomsText = [description.trim(), ...selectedSymptoms]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!symptomsText) {
      showToast('Please enter or select your symptoms.', 'error');
      return;
    }

    const token = localStorage.getItem('access_token');

    if (!token) {
      showToast('Please log in again to save your predictions.', 'error');
      return;
    }

    setIsEmergency(containsEmergencyWarning(symptomsText));
    setIsLoading(true);
    setResult(null);
    setSubmittedSymptoms(symptomsText);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/predict/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          symptoms: symptomsText
        })
      });

      const responseData = await response.json().catch(() => null);

      if (response.status === 401 || response.status === 403) {
        throw new Error('Your session has expired. Please log in again.');
      }

      if (!response.ok) {
        throw new Error(
          responseData?.detail ||
          responseData?.message ||
          `Server error: ${response.status}`
        );
      }

      if (
        !responseData ||
        typeof responseData.disease !== 'string' ||
        typeof responseData.confidence !== 'number'
      ) {
        throw new Error(
          'The prediction API returned an invalid response.'
        );
      }

      const safeResult: PredictionResult = {
        disease: responseData.disease,
        confidence: responseData.confidence,
        specialist:
          typeof responseData.specialist === 'string'
            ? responseData.specialist
            : 'General Physician',
        differentials: Array.isArray(responseData.differentials)
          ? responseData.differentials.filter(
              (item: any) =>
                item &&
                typeof item.disease === 'string' &&
                typeof item.confidence === 'number'
            )
          : [],
        model:
          typeof responseData.model === 'string'
            ? responseData.model
            : 'unknown',
        low_confidence: Boolean(responseData.low_confidence),
        result_note:
          typeof responseData.result_note === 'string'
            ? responseData.result_note
            : undefined
      };

      if (safeResult.model === 'emergency_safety_check') {
        setIsEmergency(true);
      }

      console.info('Symptoms sent:', symptomsText);
      console.info('Prediction response:', safeResult);

      setResult(safeResult);
    } catch (error: unknown) {
      showToast(
        error instanceof Error
          ? error.message
          : 'Failed to connect to the backend.',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  }, [description, selectedSymptoms, showToast]);

  return (
    <Layout>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}

      <div className="flex-grow w-full flex flex-col gap-gutter max-w-screen-2xl">

        {isEmergency && (
          <div
            role="alert"
            className="w-full brutalist-border flash-emergency p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-3xl">
                error
              </span>
              <span className="font-headline-md font-bold uppercase tracking-widest">
                CRITICAL SYMPTOMS REPORTED
              </span>
            </div>
            <Button
              onClick={() => window.open('tel:112')}
              className="!bg-primary !text-white font-label-caps px-4 py-2 brutalist-border"
            >
              CALL EMERGENCY 112
            </Button>
          </div>
        )}

        <header className="flex flex-col border-b-4 border-primary pb-4 mb-4">
          <h1 className="font-headline-xl text-primary font-bold tracking-tighter uppercase leading-none md:text-headline-xl text-headline-lg-mobile">
            SYMPTOM DIAGNOSTIC MODULE
          </h1>
          <p className="font-data-mono text-data-mono text-on-surface-variant mt-2 uppercase">
            Input patient data for AI-assisted symptom analysis.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">

          <div className="lg:col-span-8 flex flex-col gap-gutter">

            <div className="bg-surface p-gutter brutalist-border flex flex-col gap-4 relative">
              <div className="absolute top-0 right-0 bg-secondary-container text-primary font-label-caps px-3 py-1 border-l-4 border-b-4 border-primary">
                PRIMARY INPUT
              </div>

              <label
                className="font-headline-md font-bold text-primary flex items-center gap-2"
                htmlFor="condition-desc"
              >
                <span className="material-symbols-outlined">
                  edit_note
                </span>
                Describe your condition...
              </label>

              <Textarea
                id="condition-desc"
                placeholder="E.g., I have been experiencing a headache and mild fever for the past 2 days..."
                rows={5}
                value={description}
                onChange={handleDescriptionChange}
                className="w-full"
              />
            </div>

            <div className="bg-surface p-gutter brutalist-border flex flex-col gap-4 ai-border-left">
              <label className="font-headline-md font-bold text-primary flex items-center gap-2">
                <span className="material-symbols-outlined">
                  add_circle
                </span>
                Quick Select Symptoms
              </label>

              <div className="flex flex-wrap gap-3">
                {[
                  'Cough',
                  'Fever',
                  'Fatigue',
                  'Nausea',
                  'Headache',
                  'Shortness of Breath'
                ].map(symptom => (
                  <button
                    key={symptom}
                    type="button"
                    onClick={() => toggleSymptom(symptom)}
                    aria-pressed={selectedSymptoms.includes(symptom)}
                    className={`font-data-mono px-4 py-2 border-2 border-border transition-colors cursor-pointer ${
                      selectedSymptoms.includes(symptom)
                        ? 'bg-secondary-container font-bold text-primary dark:text-black'
                        : 'bg-surface-container-lowest hover:bg-secondary-container dark:hover:text-black'
                    }`}
                  >
                    {symptom}
                  </button>
                ))}
              </div>

              {selectedSymptoms.length > 0 && (
                <p className="font-data-mono text-xs text-on-surface-variant">
                  Selected: {selectedSymptoms.join(', ')}
                </p>
              )}
            </div>

            <div
              onClick={() => navigate('/reports')}
              className="bg-surface p-gutter dashed-upload-border flex flex-col items-center justify-center gap-4 text-center min-h-[200px] hover:bg-[#FFD500]/10 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[48px] text-primary">
                upload_file
              </span>
              <div>
                <h3 className="font-headline-md font-bold text-primary">
                  Upload Medical Reports
                </h3>
                <p className="font-body-md text-on-surface-variant">
                  Upload lab results, imaging, or previous diagnoses (PDF, JPG, PNG).
                </p>
              </div>
              <Button className="!bg-white !text-primary px-6 py-2 border-2 border-primary normal-case">
                BROWSE FILES
              </Button>
            </div>

            <Button
              onClick={executePrediction}
              disabled={isLoading}
              className="!bg-white !text-primary font-headline-lg font-bold p-6 brutalist-border shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px] transition-all w-full flex justify-between items-center group normal-case border-4 disabled:opacity-70"
            >
              <span>
                {isLoading ? 'PROCESSING...' : 'EXECUTE PREDICTION'}
              </span>
              <span
                className={`material-symbols-outlined text-[40px] ${
                  isLoading ? 'animate-spin' : 'group-hover:translate-x-2'
                }`}
              >
                {isLoading ? 'progress_activity' : 'arrow_forward'}
              </span>
            </Button>

            {result && (
              <div className={`bg-surface brutalist-border border-l-8 p-gutter flex flex-col gap-4 animate-[fadeIn_0.3s_ease-in] ${
                result.model === 'emergency_safety_check'
                  ? 'border-l-error'
                  : 'border-l-[#00E5FF]'
              }`}>

                <div className="flex items-center justify-between border-b-4 border-primary pb-3">
                  <h3 className="font-headline-md font-bold text-primary uppercase flex items-center gap-2">
                    <span className="material-symbols-outlined">
                      diagnosis
                    </span>
                    Prediction Result
                  </h3>
                  <span className="font-data-mono bg-secondary-container text-primary px-2 py-1 border-2 border-primary text-[10px] uppercase">
                    {result.model === 'local_rf_v1' ? 'AI MODEL' : 'OTHER MODEL'}
                  </span>
                </div>

                <div className="bg-surface-container-low p-3 border border-outline-variant">
                  <p className="font-label-caps text-on-surface-variant uppercase mb-1">
                    Symptoms sent to AI model
                  </p>
                  <p className="font-data-mono text-sm text-on-surface break-words">
                    {submittedSymptoms}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="font-label-caps text-on-surface-variant uppercase">
                    {result.model === 'emergency_safety_check'
                      ? 'Emergency safety alert'
                      : 'Highest-ranked model match'}
                  </span>
                  <span className="font-headline-lg font-bold text-primary">
                    {result.disease}
                  </span>
                  <div className="flex flex-wrap gap-4 font-data-mono text-sm">
                    <span>
                      Model confidence:{' '}
                      <strong>{formatConfidence(result.confidence)}</strong>
                    </span>
                    <span>
                      Model: <strong>{result.model}</strong>
                    </span>
                  </div>
                </div>

                {result.model === 'emergency_safety_check' && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 bg-error-container border-2 border-error p-3"
                  >
                    <span className="material-symbols-outlined text-error text-[18px] mt-0.5">
                      emergency
                    </span>
                    <p className="font-data-mono text-on-error-container text-xs uppercase leading-relaxed">
                      Potential emergency warning symptoms detected.
                      Seek immediate medical assessment. Do not wait for
                      an AI prediction.
                    </p>
                  </div>
                )}

                {(result.low_confidence || result.confidence < 0.35) && (
                  <div className="flex items-start gap-2 bg-error-container border-2 border-error p-3">
                    <span className="material-symbols-outlined text-error text-[18px] mt-0.5">
                      warning
                    </span>
                    <p className="font-data-mono text-on-error-container text-[11px] uppercase leading-relaxed">
                      Low-confidence result. The model has limited certainty.
                      Please provide additional symptoms. This is not a confirmed diagnosis.
                    </p>
                  </div>
                )}

                {result.result_note && (
                  <p className="font-data-mono text-xs text-on-surface-variant leading-relaxed">
                    {result.result_note}
                  </p>
                )}

                <div className="flex flex-col gap-3">
                  <span className="font-label-caps text-on-surface-variant uppercase">
                    Top Model Matches
                  </span>

                  {result.differentials.length > 0 ? (
                    result.differentials.map((item, index) => (
                      <div
                        key={`${item.disease}-${index}`}
                        className="flex justify-between items-center gap-3 font-data-mono border-b border-outline-variant pb-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-on-surface-variant">
                            #{index + 1}
                          </span>
                          <span className="text-on-surface font-semibold">
                            {item.disease}
                          </span>
                        </div>
                        <span className="text-on-surface-variant text-xs">
                          {formatConfidence(item.confidence)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="font-data-mono text-xs text-on-surface-variant">
                      No alternative matches are available.
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 bg-secondary-container p-3 border-2 border-primary">
                  <span className="material-symbols-outlined text-primary">
                    stethoscope
                  </span>
                  <div>
                    <p className="font-label-caps text-on-surface-variant uppercase">
                      Suggested Specialist
                    </p>
                    <p className="font-headline-sm font-bold text-primary">
                      {result.specialist}
                    </p>
                  </div>
                </div>

                <p className="font-data-mono text-on-surface-variant text-[11px] mt-2 border-t border-outline-variant pt-2 uppercase">
                  Experimental AI-generated possibilities only. Not a medical
                  diagnosis. Seek qualified medical advice for evaluation.
                </p>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 flex flex-col gap-gutter">

            <div className="bg-primary text-white p-gutter brutalist-border shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center gap-3 mb-4 border-b-4 border-white pb-4">
                <span className="material-symbols-outlined">memory</span>
                <h2 className="font-headline-md font-bold">
                  AI ENGINE STATUS
                </h2>
              </div>

              <div className="flex flex-col gap-2 font-data-mono">
                <div className="flex justify-between border-b border-surface-tint pb-1">
                  <span>Model:</span>
                  <span className="text-secondary-fixed font-bold">
                    {result
                      ? result.model === 'local_rf_v1'
                        ? 'RF_CLASSIFIER_V1'
                        : 'OTHER MODEL'
                      : 'STANDBY'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-surface-tint pb-1">
                  <span>Prediction:</span>
                  <span>{result ? 'GENERATED' : 'WAITING'}</span>
                </div>
                <div className="flex justify-between border-b border-surface-tint pb-1">
                  <span>Disease Classes:</span>
                  <span>41</span>
                </div>
                <div className="flex justify-between mt-2">
                  <span>System Readiness:</span>
                  <span className="text-secondary-fixed">
                    {isLoading ? 'PROCESSING' : 'ONLINE'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-surface p-gutter brutalist-border ai-border-left">
              <h3 className="font-headline-md font-bold text-primary mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined">policy</span>
                Guidelines
              </h3>
              <ul className="font-body-md text-primary flex flex-col gap-4">
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-secondary">
                    check_circle
                  </span>
                  <span>Provide as much detail as possible in the text area.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-secondary">
                    check_circle
                  </span>
                  <span>Include duration, severity, and any associated symptoms.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#FF4D4D]">
                    warning
                  </span>
                  <span>
                    Do not use this tool for active life-threatening emergencies.
                    Call emergency services immediately.
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-surface brutalist-border overflow-hidden h-64 relative group">
              <div
                role="img"
                aria-label="Clinical environment illustration"
                className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 transition-all duration-500 bg-center bg-cover"
                style={{
                  backgroundImage:
                    "url('https://lh3.googleusercontent.com/aida-public/AB6AXuB6H-pBfysHlyG4jALgGqrPTx86Psg3RdHMc0_sSIazjjDLfYQcjxlmva3vvv6AhcOowBq_Mq-9OXrvAn3irVo6Bii0lHQx5EcnJqK2XokPBES0T-6DbR7XkkT_xNhssHwi7SxvckdFocI1e_AMXUjjND9VtsJSJ5JlbDKCSbT5TlbaohljvUXTBsIFQjskj5TOtMb72Wm1CoWFYcMN8p8a87ClVRRwl7JpEMmflwdMgi9tbi-OQQOyIDS3FlwqAJK72oCJZobRplVs')"
                }}
              />
              <div className="absolute bottom-0 left-0 w-full bg-primary text-white p-2 font-data-mono border-t-4 border-black">
                CLINICAL_ENV_RENDER_01
              </div>
            </div>

          </div>
        </div>
      </div>
    </Layout>
  );
}
