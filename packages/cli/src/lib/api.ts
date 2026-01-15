/**
 * API Client
 * 
 * HTTP client for communicating with LazyKitty API
 */

import FormData from 'form-data';
import type { 
  UploadRequest, 
  UploadResponse, 
  BuildStatusResponse, 
  BuildListResponse,
} from '@lazykitty/shared';
import { ROUTES } from '@lazykitty/shared';

export class ApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = apiKey;
  }

  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
    };
  }

  /**
   * Upload a tarball and start a build
   */
  async upload(tarball: Buffer, metadata: UploadRequest): Promise<UploadResponse> {
    const form = new FormData();
    form.append('tarball', tarball, {
      filename: 'project.tar.gz',
      contentType: 'application/gzip',
    });
    form.append('metadata', JSON.stringify(metadata));

    const response = await fetch(`${this.baseUrl}${ROUTES.UPLOAD}`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        ...form.getHeaders(),
      },
      body: form.getBuffer(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' })) as { error: string };
      throw new Error(error.error || `Upload failed: ${response.status}`);
    }

    return response.json() as Promise<UploadResponse>;
  }

  /**
   * Get build status
   */
  async getBuild(buildId: string): Promise<BuildStatusResponse> {
    const response = await fetch(`${this.baseUrl}${ROUTES.BUILD(buildId)}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' })) as { error: string };
      throw new Error(error.error || `Failed to get build: ${response.status}`);
    }

    return response.json() as Promise<BuildStatusResponse>;
  }

  /**
   * List builds
   */
  async listBuilds(projectSlug?: string): Promise<BuildListResponse> {
    const url = new URL(`${this.baseUrl}${ROUTES.BUILDS}`);
    if (projectSlug) {
      url.searchParams.set('projectSlug', projectSlug);
    }

    const response = await fetch(url.toString(), {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' })) as { error: string };
      throw new Error(error.error || `Failed to list builds: ${response.status}`);
    }

    return response.json() as Promise<BuildListResponse>;
  }

  /**
   * Check API health
   */
  async health(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
