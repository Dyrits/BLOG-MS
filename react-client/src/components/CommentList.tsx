import { useEffect, useState } from "react";
import axios from "axios";

import { Comment } from "../types.ts";
import attempt from "../utilities/attempt.ts";
import CommentCreate from "./CommentCreate.tsx";

type Properties = {
  post$id: string;
}

function PostList({ post$id }: Properties) {
  const [comments, setComments] = useState<Comment[]>([]);

  async function getComments() {
    const [error, response] = await attempt(() => axios.get(`http://localhost:4010/posts/${post$id}/comments`));
    if (!error) {
      return response.data;
    }
  }

  async function createComment(content: string) {
    const [error, response] = await attempt(() => axios.post(`http://localhost:4010/posts/${post$id}/comments`, {
      content
    }));
    if (!error) {
      setComments([...comments, response.data]);
    }
  }

  useEffect(() => {
    getComments().then((comments: Comment[]) => {
      comments && setComments(comments);
    })
  }, []);

  return (
    <>
      <h3>Comments ({comments.length})</h3>
      <ul>
        {comments.map(comment => (
          <li key={comment.id}>{comment.content}</li>
        ))}
      </ul>
      <CommentCreate create={createComment} />
    </>
  );
}

export default PostList;