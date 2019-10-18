module.exports = {
    db:
        process.env.MONGODB_URL ||
        `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0-aeadb.gcp.mongodb.net/recipes?retryWrites=true&w=majority`,
};
