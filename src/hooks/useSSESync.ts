// src/hooks/useSSESync.ts - POLLING VERSION

import { useEffect, useRef } from 'react';
import { aiEngineService } from '@/services/aiEngine';
import { useJobStore } from '@/store/jobStore';

/**
 * Hook to poll for job status updates
 * This is a temporary solution until CORS is fixed for SSE
 */
export function useSSESync(token: string | null) {
  const { getActiveJobs, updateJobByJobId } = useJobStore();
  const pollingIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!token) {
      // No token, stop polling
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // Start polling every 3 seconds
    pollingIntervalRef.current = setInterval(async () => {
      const activeJobs = getActiveJobs();
      
      // Check each active job
      for (const job of activeJobs) {
        try {
          console.log('Polling job:', job.jobId);
          
          const result = await aiEngineService.getJobStatus(job.jobId, token);
          
          // Check if job is completed
          if (result.data.status === 'job finished') {
            console.log('Job completed:', job.jobId);
            
            // Extract transcribed text
            const transcribedText = result.data.output?.transcriptions
              ?.map(t => t.transcribedText)
              .join('\n\n') || 'No transcription available';
            
            // Update job with result
            updateJobByJobId(job.jobId, {
              status: 'completed',
              completedAt: Date.now(),
              output: {
                transcribedText,
                data: result.data.output,
              },
            });
          } else if (result.data.status === 'job is in progress') {
            // Update status to processing
            updateJobByJobId(job.jobId, { status: 'processing' });
          } else if (result.data.status === 'job failed') {
            // Update to failed
            updateJobByJobId(job.jobId, {
              status: 'failed',
              completedAt: Date.now(),
              error: 'Job failed',
            });
          }
        } catch (error) {
          console.error('Failed to poll job:', job.jobId, error);
        }
      }
    }, 3000); // Poll every 3 seconds

    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [token, getActiveJobs, updateJobByJobId]);
}


















// // src/hooks/useSSESync.ts   ----------------> FOR SSE (NOT WORKING DUE TO CORS)

// import { useEffect } from 'react';
// import { sseManager } from '@/services/sseManager';
// import { aiEngineService } from '@/services/aiEngine';
// import { useJobStore } from '@/store/jobStore';
// import type { SSENotification } from '@/types';

// /**
//  * Hook to sync SSE notifications with job store
//  * Call this once when user logs in
//  */
// export function useSSESync(token: string | null) {
//   const { updateJobByJobId } = useJobStore();

//   useEffect(() => {
//     if (!token) {
//       // User logged out, disconnect SSE
//       sseManager.disconnect();
//       return;
//     }

//     // Connect SSE
//     sseManager.connect(token);

//     // Subscribe to notifications
//     const unsubscribe = sseManager.subscribe(async (notification: SSENotification) => {
//       console.log('SSE notification:', notification);

//       const { job_id, status } = notification;

//       // Map backend status to our job status
//       let jobStatus: 'pending' | 'processing' | 'completed' | 'failed';
      
//       if (status === 'started') {
//         jobStatus = 'pending';
//       } else if (status === 'processing') {
//         jobStatus = 'processing';
//       } else if (status === 'completed') {
//         jobStatus = 'completed';
//       } else if (status === 'failed') {
//         jobStatus = 'failed';
//       } else {
//         console.warn('Unknown SSE status:', status);
//         return;
//       }

//       // Update job status in store
//       updateJobByJobId(job_id, { status: jobStatus });

//       // If completed, fetch the result
//       if (status === 'completed') {
//         try {
//           const result = await aiEngineService.getJobStatus(job_id, token);
          
//           // Extract transcribed text from STT response
//           const transcribedText = 
//             result.data.output?.transcriptions?.[0]?.transcribedText || '';

//           // Update job with output
//           updateJobByJobId(job_id, {
//             status: 'completed',
//             completedAt: Date.now(),
//             output: {
//               transcribedText,
//               data: result.data.output, // Store full output
//             },
//           });
//         } catch (error) {
//           console.error('Failed to fetch job result:', error);
//           updateJobByJobId(job_id, {
//             status: 'failed',
//             error: 'Failed to fetch result',
//           });
//         }
//       }

//       // If failed, update with error
//       if (status === 'failed') {
//         updateJobByJobId(job_id, {
//           status: 'failed',
//           completedAt: Date.now(),
//           error: 'Job failed',
//         });
//       }
//     });

//     // Cleanup on unmount or token change
//     return () => {
//       unsubscribe();
//       sseManager.disconnect();
//     };
//   }, [token, updateJobByJobId]);
// }