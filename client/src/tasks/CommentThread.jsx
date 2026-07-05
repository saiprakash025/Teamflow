import { useEffect, useRef, useState } from 'react';
import { usersApi } from '../api/endpoints';

function buildTree(comments) {
  const byId = {};
  comments.forEach((c) => (byId[c._id] = { ...c, children: [] }));
  const roots = [];
  comments.forEach((c) => {
    if (c.parentComment && byId[c.parentComment]) {
      byId[c.parentComment].children.push(byId[c._id]);
    } else {
      roots.push(byId[c._id]);
    }
  });
  return roots;
}

function renderBody(body) {
  // highlight @Name mentions written inline in the text
  const parts = body.split(/(@[A-Za-z]+)/g);
  return parts.map((part, i) =>
    part.startsWith('@') ? (
      <span key={i} className="mention">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function CommentComposer({ onSubmit, placeholder = 'Write a comment…', autoFocus }) {
  const [body, setBody] = useState('');
  const [mentionResults, setMentionResults] = useState([]);
  const [mentionIds, setMentionIds] = useState([]);
  const textareaRef = useRef(null);

  async function handleChange(e) {
    const value = e.target.value;
    setBody(value);

    const cursor = e.target.selectionStart;
    const upToCursor = value.slice(0, cursor);
    const match = upToCursor.match(/@(\w*)$/);

    if (match) {
      const res = await usersApi.search(match[1]);
      setMentionResults(res.data);
    } else {
      setMentionResults([]);
    }
  }

  function pickMention(user) {
    const cursor = textareaRef.current.selectionStart;
    const upToCursor = body.slice(0, cursor);
    const replaced = upToCursor.replace(/@(\w*)$/, `@${user.name.split(' ')[0]} `);
    const newBody = replaced + body.slice(cursor);
    setBody(newBody);
    setMentionIds((ids) => Array.from(new Set([...ids, user._id])));
    setMentionResults([]);
    textareaRef.current.focus();
  }

  function submit() {
    if (!body.trim()) return;
    onSubmit({ body, mentions: mentionIds });
    setBody('');
    setMentionIds([]);
  }

  return (
    <div className="autocomplete-wrapper">
      <textarea
        ref={textareaRef}
        rows={2}
        style={{ width: '100%' }}
        placeholder={placeholder}
        value={body}
        onChange={handleChange}
        autoFocus={autoFocus}
      />
      {mentionResults.length > 0 && (
        <div className="autocomplete-list">
          {mentionResults.map((u) => (
            <div key={u._id} className="autocomplete-item" onClick={() => pickMention(u)}>
              {u.name} <span style={{ color: 'var(--text-muted)' }}>({u.email})</span>
            </div>
          ))}
        </div>
      )}
      <button className="btn btn-sm btn-primary" style={{ marginTop: 6 }} onClick={submit} disabled={!body.trim()}>
        Comment
      </button>
    </div>
  );
}

function CommentNode({ node, onReply, replyingTo, setReplyingTo }) {
  return (
    <div className={`comment ${node.parentComment ? 'reply' : ''}`}>
      <div className="comment-author">{node.author?.name || 'Unknown'}</div>
      <div className="comment-body">{renderBody(node.body)}</div>
      <button className="comment-reply-btn" onClick={() => setReplyingTo(replyingTo === node._id ? null : node._id)}>
        Reply
      </button>

      {replyingTo === node._id && (
        <div style={{ marginTop: 8 }}>
          <CommentComposer
            autoFocus
            placeholder={`Reply to ${node.author?.name || ''}…`}
            onSubmit={(data) => {
              onReply({ ...data, parentComment: node._id });
              setReplyingTo(null);
            }}
          />
        </div>
      )}

      {node.children.map((child) => (
        <CommentNode key={child._id} node={child} onReply={onReply} replyingTo={replyingTo} setReplyingTo={setReplyingTo} />
      ))}
    </div>
  );
}

export default function CommentThread({ comments, onAddComment }) {
  const [replyingTo, setReplyingTo] = useState(null);
  const tree = buildTree(comments || []);

  return (
    <div>
      {tree.map((node) => (
        <CommentNode key={node._id} node={node} onReply={onAddComment} replyingTo={replyingTo} setReplyingTo={setReplyingTo} />
      ))}

      {tree.length === 0 && (
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>No comments yet.</div>
      )}

      <CommentComposer onSubmit={(data) => onAddComment({ ...data, parentComment: null })} />
    </div>
  );
}
