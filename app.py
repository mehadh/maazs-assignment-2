from flask import *
import random
import math
app = Flask(__name__)
@app.route('/')
def index():
    return render_template('index.html')
varsArr = {
    'clusters': [],
    'data': [],
    'iteration': 0,
    'centroids': [],
    'k': 0
}
@app.route('/generator', methods=['POST'])
def generator():
    global varsArr
    def genData(pt=50, xr=(0, 100), yr=(0, 100)):
        data = []
        for _ in range(pt):
            x = random.uniform(*xr)
            y = random.uniform(*yr)
            data.append([x, y])
        return data
    data = genData()
    varsArr['data'] = data
    return jsonify(data)
def distCheck(x1, x2):
    distance_squared = 0
    for x, y in zip(x1, x2):
        distance_squared += (x - y) ** 2
    return math.sqrt(distance_squared)
def kmeans1(data, centroids):
    num_centroids = len(centroids)
    clusters = [[] for _ in range(num_centroids)]
    for point in data:
        min_distance = float('inf')
        closest_index = -1
        for i, centroid in enumerate(centroids):
            distance = distCheck(point, centroid)
            if distance < min_distance:
                min_distance = distance
                closest_index = i
        clusters[closest_index].append(point)
    new_centroids = []
    for cluster in clusters:
        if len(cluster) > 0:
            new_centroids.append([sum(coord) / len(cluster) for coord in zip(*cluster)])
        else:
            new_centroids.append(random.choice(data))
    return new_centroids, clusters
@app.route('/initialize', methods=['POST'])
def initialize():
    global varsArr
    dataset = request.json.get('data')
    num_clusters = request.json.get('k')
    init_method = request.json.get('initialization')
    if not dataset or len(dataset) == 0:
        return jsonify({'error': 'NEEDSINIT'}), 400
    if init_method == 'random':
        starting_centroids = random.sample(dataset, num_clusters)
    elif init_method == 'farthest':
        starting_centroids = [random.choice(dataset)]
        while len(starting_centroids) < num_clusters:
            furthest_point = max(dataset, key=lambda point: min(distCheck(point, c) for c in starting_centroids))
            starting_centroids.append(furthest_point)
    elif init_method == 'kmeans++':
        starting_centroids = [random.choice(dataset)]
        while len(starting_centroids) < num_clusters:
            point_distances = [min(distCheck(point, c) for c in starting_centroids) for point in dataset]
            total_distance_sum = sum(point_distances)
            prob_weights = [d / total_distance_sum for d in point_distances]
            next_point = random.choices(dataset, weights=prob_weights)[0]
            starting_centroids.append(next_point)
    elif init_method == 'manual':
        starting_centroids = request.json.get('initial_centroids')
    varsArr['data'] = dataset
    varsArr['k'] = num_clusters
    varsArr['centroids'] = starting_centroids
    varsArr['clusters'] = [[] for _ in range(num_clusters)]
    varsArr['iteration'] = 0
    return jsonify({
        'centroids': varsArr['centroids'],
        'clusters': varsArr['clusters']
    })
    # except ValueError as e:
    #     generate_data()
    #     initialize_kmeans()
    # except:
    #     flash("bad problems in initialize k mean")
@app.route('/stepper', methods=['POST'])
def stepper():
    global varsArr
    data = varsArr['data']
    if len(data) == 0 or not data:
            return jsonify({'error': 'NEEDSINIT'}), 400
    try:
        new_centroids, clusters = kmeans1(varsArr['data'], varsArr['centroids'])
        converged = new_centroids == varsArr['centroids']
        varsArr['centroids'] = new_centroids
        varsArr['clusters'] = clusters
        varsArr['iteration'] += 1
        return jsonify({
            'centroids': new_centroids,
            'clusters': clusters,
            'converged': converged
        })
    except:
        return jsonify({'error': 'STEPBAD'}), 400
def kmeanAll(data, k, initial_centroids, max_iterations=100):
    centroids = initial_centroids[:]
    iteration = 0
    while iteration < max_iterations:
        new_centroids, clusters = kmeans1(data, centroids)
        if new_centroids == centroids:
            break
        centroids = new_centroids
        iteration += 1
    return centroids, clusters
@app.route('/runner', methods=['POST'])
def run_kmeans_final():
    try:
        data = request.json['data']
        if len(data) == 0 or not data:
            return jsonify({'error': 'NEEDSINIT'}), 400
        k = request.json['k']
        initial_centroids = request.json['initial_centroids']
        centroids, clusters = kmeanAll(data, k, initial_centroids)
        return jsonify({
            'centroids': centroids,
            'clusters': clusters,
            'converged': True
        })
    except:
        return jsonify({'error': 'BAD'}), 400
if __name__ == '__main__':
    app.run(debug=True, host='localhost', port=3000)

