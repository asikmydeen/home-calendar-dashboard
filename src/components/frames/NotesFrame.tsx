import React, { useState, useEffect } from 'react';
import { Frame } from '@/types/dashboard';
import { useDebounceValue } from 'usehooks-ts';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';

interface NotesFrameProps {
  frame: Frame;
}

export default function NotesFrame({ frame }: NotesFrameProps) {
  const [content, setContent] = useState(frame.config.content || '');
  const [isSaving, setIsSaving] = useState(false);
  const [debouncedContent] = useDebounceValue(content, 1000);

  // Mock save for now, normally we'd save to a subcollection or the frame config
  useEffect(() => {
    if (debouncedContent === frame.config.content) return;
    
    const saveNote = async () => {
      setIsSaving(true);
      // Simulate save
      console.log('Saving note:', debouncedContent);
      await new Promise(r => setTimeout(r, 500));
      setIsSaving(false);
    };

    if (debouncedContent) saveNote();
  }, [debouncedContent, frame.config.content]);

  return (
    <div className="h-full w-full flex flex-col bg-yellow-50 dark:bg-yellow-900/20 p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 uppercase tracking-wider">Notes</h3>
        {isSaving && <Loader2 className="w-3 h-3 animate-spin text-yellow-600" />}
      </div>
      <textarea
        className="flex-1 w-full bg-transparent resize-none outline-none text-lg text-zinc-800 dark:text-yellow-100 placeholder-yellow-800/30"
        placeholder="Type something..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
    </div>
  );
}
