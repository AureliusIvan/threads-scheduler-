'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Link from '@tiptap/extension-link';
import { useCallback, useEffect, useState } from 'react';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Link as LinkIcon,
  Unlink,
  Undo,
  Redo
} from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  maxLength?: number;
  autoSave?: boolean;
  autoSaveDelay?: number;
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder = "What's happening?",
  maxLength = 500,
  autoSave = true,
  autoSaveDelay = 1000,
}: RichTextEditorProps) {
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      CharacterCount.configure({
        limit: maxLength,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline',
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      const newContent = editor.getHTML();
      onChange(newContent);

      // Handle auto-save
      if (autoSave) {
        if (autoSaveTimeout) {
          clearTimeout(autoSaveTimeout);
        }

        const timeout = setTimeout(async () => {
          setIsSaving(true);
          try {
            // Here you would typically save to your backend
            // For now, we'll just simulate the save
            await new Promise(resolve => setTimeout(resolve, 300));
            setLastSaved(new Date());
          } catch (error) {
            console.error('Auto-save failed:', error);
          } finally {
            setIsSaving(false);
          }
        }, autoSaveDelay);

        setAutoSaveTimeout(timeout);
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[120px] p-4',
      },
    },
  });

  useEffect(() => {
    return () => {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }
    };
  }, [autoSaveTimeout]);

  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    // cancelled
    if (url === null) {
      return;
    }

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // update link
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return null;
  }

  const characterCount = editor.storage.characterCount.characters();
  const isNearLimit = characterCount > maxLength * 0.8;
  const isOverLimit = characterCount > maxLength;

  return (
    <div className="border border-gray-300 rounded-lg bg-white">
      {/* Toolbar */}
      <div className="border-b border-gray-200 px-3 py-2 flex items-center gap-1 flex-wrap">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-100 ${
            editor.isActive('bold') ? 'bg-gray-100 text-blue-600' : 'text-gray-600'
          }`}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-100 ${
            editor.isActive('italic') ? 'bg-gray-100 text-blue-600' : 'text-gray-600'
          }`}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-gray-100 ${
            editor.isActive('bulletList') ? 'bg-gray-100 text-blue-600' : 'text-gray-600'
          }`}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-gray-100 ${
            editor.isActive('orderedList') ? 'bg-gray-100 text-blue-600' : 'text-gray-600'
          }`}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <button
          onClick={setLink}
          className={`p-2 rounded hover:bg-gray-100 ${
            editor.isActive('link') ? 'bg-gray-100 text-blue-600' : 'text-gray-600'
          }`}
          title="Add Link"
        >
          <LinkIcon className="h-4 w-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().unsetLink().run()}
          disabled={!editor.isActive('link')}
          className="p-2 rounded hover:bg-gray-100 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Remove Link"
        >
          <Unlink className="h-4 w-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          className="p-2 rounded hover:bg-gray-100 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Undo"
        >
          <Undo className="h-4 w-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          className="p-2 rounded hover:bg-gray-100 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Redo"
        >
          <Redo className="h-4 w-4" />
        </button>

        {/* Auto-save indicator */}
        <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
          {isSaving && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span>Saving...</span>
            </div>
          )}
          {!isSaving && lastSaved && (
            <span>
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="relative">
        <EditorContent editor={editor} />
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 px-4 py-2 flex items-center justify-between text-sm">
        <div className="text-gray-500">
          {editor.isActive('link') && (
            <span className="text-blue-600">
              Link: {editor.getAttributes('link').href}
            </span>
          )}
        </div>
        <div className={`font-medium ${
          isOverLimit ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-gray-500'
        }`}>
          {characterCount}/{maxLength}
        </div>
      </div>
    </div>
  );
} 