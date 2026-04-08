import logger from '../utils/logger.js';
import { classifyWorker } from './classify.worker.js';
import { generateWorker } from './generate.worker.js';
import { postReplyWorker } from './postReply.worker.js';

const workers = [classifyWorker, generateWorker, postReplyWorker];

workers.forEach((worker) => {
    worker.on('completed', (job) => {
        logger.debug(`[Worker ${worker.name}] Job ${job.id} completed successfully`);
    });

    worker.on('failed', (job, err) => {
        logger.error(`[Worker ${worker.name}] Job ${job?.id ?? 'unknown'} failed with error: ${err.message}`);
    });

    worker.on('error', (err) => {
        logger.error(`[Worker ${worker.name}] process error: ${err.message}`);
    });
});

logger.info('BullMQ workers initialized: classify | generate | post-reply');

export default workers;
