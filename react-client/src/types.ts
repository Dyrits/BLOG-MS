export interface Post {
  id: string;
  title: string;
  content: string;
}

export type NewPost = Omit<Post, "id">;

export interface Posts {
  [id: string]: Post;
}

export interface Comment {
  id: string;
  post$id: string;
  content: string;
}

export type NewComment = Omit<Comment, "id">;
