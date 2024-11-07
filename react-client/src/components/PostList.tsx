import { Posts } from "../types.ts";
import CommentList from "./CommentList.tsx";

type Properties = {
  posts: Posts;
}

function PostList({ posts }: Properties) {

  return (
    <div className="d-flex flex-row flex-wrap justify-content-between">
      {Object.values(posts).map(post => (
        <div key={post.id} className="card mb-2">
          <div className="card-body">
            <h2>{post.title}</h2>
            <p>{post.content}</p>
          </div>
          <div className="card-footer">
            <CommentList post$id={post.id} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default PostList;