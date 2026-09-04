import { useCallback, useEffect, useState } from "react";
import axios from "axios";

import { Comment } from "../types.ts";
import attempt from "../utilities/attempt.ts";
import CommentStore from "./CommentStore.tsx";

type Properties = {
  post$id: string;
}

function CommentList({ post$id }: Properties) {
  const [comments, setComments] = useState<Comment[]>([]);

  const listComments = useCallback(async () => {
    const [error, response] = await attempt(() => axios.get(`http://localhost:4010/posts/${post$id}/comments`));
    if (!error) {
      return response.data;
    }
  }, [post$id]);

  async function storeComment(content: string) {
    const [error, response] = await attempt(() => axios.post(`http://localhost:4010/posts/${post$id}/comments`, {
      content
    }));
    if (!error) {
      setComments((current) => [...current, response.data]);
    }
  }

  useEffect(() => {
    listComments().then((comments: Comment[]) => {
      if (comments) setComments(comments);
    });
  }, [listComments]);

  return (
    <>
      <h3>Comments ({comments.length})</h3>
      <ul>
        {comments.map(comment => (
          <li key={comment.id}>{comment.content}</li>
        ))}
      </ul>
      <CommentStore store={storeComment} />
    </>
  );
}

export default CommentList;
