import { useMemo, useState } from "react"
import { useUpload } from "../../hooks/use-upload"
import { DropZone } from "./drop-zone"

export function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [sourceUrl, setSourceUrl] = useState("")
  const [description, setDescription] = useState("")
  const [tagsInput, setTagsInput] = useState("")
  const upload = useUpload()

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)

    upload.mutate({
      file,
      sourceUrl: sourceUrl || undefined,
      description: description || undefined,
      tags: tags.length > 0 ? tags : undefined,
    })
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 p-6">
      <h1 className="text-xl font-semibold">Upload a swipe</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <DropZone
          onFileSelect={setFile}
          preview={preview}
          isVideo={file?.type.startsWith("video/") ?? false}
        />

        <div>
          <label htmlFor="source-url" className="mb-1 block text-sm font-medium text-gray-700">
            Source URL
          </label>
          <input
            id="source-url"
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What caught your eye?"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="tags" className="mb-1 block text-sm font-medium text-gray-700">
            Tags
          </label>
          <input
            id="tags"
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="typography, color, layout"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={!file || upload.isPending}
          className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {upload.isPending ? "Uploading..." : "Upload"}
        </button>

        {upload.isError && <p className="text-sm text-red-600">Upload failed. Please try again.</p>}
      </form>
    </div>
  )
}
