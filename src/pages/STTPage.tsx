import { useState, useEffect } from 'react';
import { useJobStore } from '@/store/jobStore';
import { useSSESync } from '@/hooks/useSSESync';
import { FeatureLayout } from '@/components/FeatureLayout';
import { SplitView } from '@/components/SplitView';
import { AudioInput } from '@/components/AudioInput';
import { STTSettings } from '@/components/STTSettings';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { aiEngineService } from '@/services/aiEngine';
import { Loader2 } from 'lucide-react';

export function STTPage() {
  const [showOutput, setShowOutput] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [viewMode, setViewMode] = useState<'horizontal' | 'vertical'>('horizontal');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<number | null>(null);
  const [transcriptionResult, setTranscriptionResult] = useState<string>('');

  // Get token from auth store
  const { token } = useAuthStore();
  // Initialize SSE sync
  useSSESync(token);

  // Get job store methods
  // const { addJob, getJobByJobId } = useJobStore();
  const addJob = useJobStore((state) => state.addJob);
  const currentJob = useJobStore((state) => 
    currentJobId ? state.getJobByJobId(currentJobId) : undefined
  );

  // Settings state
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [device, setDevice] = useState('cpu');
  const [generateTimestamp, setGenerateTimestamp] = useState(true);
  const [timestampFormat, setTimestampFormat] = useState('srt');

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    console.log('File selected:', file.name, file.size);
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      alert('Please upload or record an audio file first');
      return;
    }

    if (!selectedLanguage) {
      alert('Please select audio language');
      return;
    }

    if (!token) {
      alert('Please login first');
      return;
    }

    setIsSubmitting(true);

    try {
      // Submit job to API
      const jobId = await aiEngineService.submitSTTJob(
        selectedFile,
        token,
        {
          model_name: selectedModel,
          transcription_language: selectedLanguage,
          device: device,
          generate_timestamp: generateTimestamp,
          timestamp_file_format: generateTimestamp ? timestampFormat : undefined,
        }
      );

      console.log('Job submitted successfully! Job ID:', jobId);

      // Add job to store
      addJob({
        jobId,
        type: 'stt',
        status: 'pending',
        input: {
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          params: {
            language: selectedLanguage,
            model: selectedModel,
          }
        }
      });

      // Store job ID
      setCurrentJobId(jobId);

      // Show output section with "Processing..." state
      setShowOutput(true);
      setHasSubmitted(true);
      setTranscriptionResult(''); // Clear previous result

      // TODO: SSE will notify us when complete (Phase 2)
      // For now, we can poll or wait for SSE notification

    } catch (error) {
      console.error('Failed to submit job:', error);
      alert(`Failed to submit transcription job: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = selectedFile && selectedLanguage && !isSubmitting;

  // Settings content for right panel
  const settingsContent = (
    <STTSettings
      selectedLanguage={selectedLanguage}
      selectedModel={selectedModel}
      device={device}
      generateTimestamp={generateTimestamp}
      timestampFormat={timestampFormat}
      onLanguageChange={setSelectedLanguage}
      onModelChange={setSelectedModel}
      onDeviceChange={setDevice}
      onTimestampChange={setGenerateTimestamp}
      onTimestampFormatChange={setTimestampFormat}
    />
  );

  // Input section content
  const inputContent = (
    <div className="h-full p-6 flex flex-col items-center justify-center">
      <div className="w-full space-y-6">
        <AudioInput onFileSelect={handleFileSelect} />
        
        {selectedFile && (
          <div className="flex justify-center">
            <Button 
              size="lg"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="min-w-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : !selectedLanguage ? (
                'Select Language First'
              ) : (
                'Transcribe Audio'
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  // Output section content
  const outputContent = showOutput ? (
    <div className="h-full p-6">
      <div className="h-full border rounded-lg p-6 bg-muted/30">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Transcribed Text</h3>
          {currentJobId && (
            <span className="text-xs text-muted-foreground">
              Job ID: {currentJobId}
            </span>
          )}
        </div>

        {transcriptionResult ? (
          // Show actual result
          <div className="space-y-4">
            <div className="p-4 bg-background rounded-lg">
              <p className="text-sm whitespace-pre-wrap">{transcriptionResult}</p>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm">Copy</Button>
              <Button variant="outline" size="sm">Download</Button>
            </div>
          </div>
        ) : (
          // Show processing state
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center">
              <p className="text-sm font-medium">Processing your audio...</p>
              <p className="text-xs text-muted-foreground mt-1">
                This may take a few moments. You can switch to other features while waiting.
              </p>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Language: {selectedLanguage}</p>
              <p>• Model: {selectedModel}</p>
              <p>• Device: {device.toUpperCase()}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  ) : null;

  // Watch for job completion
  // useEffect(() => {
  //   if (currentJobId) {
  //     const job = getJobByJobId(currentJobId);
  //     if (job?.output?.transcribedText) {
  //       setTranscriptionResult(job.output.transcribedText);
  //     }
  //   }
  // }, [currentJobId, getJobByJobId]);

  // Watch for job completion
  useEffect(() => {
    if (currentJob?.output?.transcribedText) {
      console.log('Updating UI with transcription:', currentJob.output.transcribedText);
      setTranscriptionResult(currentJob.output.transcribedText);
    }
  }, [currentJob]);

  return (
    <FeatureLayout
      featureName="Speech To Text"
      featureType="stt"
      settingsContent={settingsContent}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      showNewButton={hasSubmitted}
    >
      <SplitView
        inputContent={inputContent}
        outputContent={outputContent}
        viewMode={viewMode}
        showOutput={showOutput}
      />
    </FeatureLayout>
  );
}