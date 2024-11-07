import { useEffect, useState } from "react";
import { NewPost, Posts } from "../types.ts";
import attempt from "../utilities/attempt.ts";
import axios from "axios";
import PostCreate from "../components/PostCreate.tsx";
import PostList from "../components/PostList.tsx";

function PostsPage() {
  const [posts, setPosts] = useState<Posts>({});

  async function getPosts() {
    const [error, response] = await attempt(() => axios.get("http://localhost:4005/posts"));
    if (!error) {
      return response.data;
    }
  }

  async function createPost(post: NewPost) {
    const [error, response] = await attempt(async () =>
      axios.post("http://localhost:4005/posts", post)
    );
    if (!error) {
      setPosts({ ...posts, [response.data.id]: response.data });
    }
  }

  useEffect(() => {
    getPosts().then((posts: Posts) => {
      posts && setPosts(posts);
    })
  }, []);

  return (
    <>
      <PostCreate create={createPost} />
      <hr />
      <h1>Posts</h1>
      <PostList posts={posts} />
    </>
  );
}

export default PostsPage;