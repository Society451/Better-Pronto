import json

def search_key(data, target_key):
    """
    Recursively search for a key in a nested dictionary and return its value.
    
    :param data: The dictionary to search.
    :param target_key: The key to search for.
    :return: The value associated with the key, or None if the key is not found.
    """
    if isinstance(data, dict):
        for key, value in data.items():
            if key == target_key:
                return value
            elif isinstance(value, dict):
                result = search_key(value, target_key)
                if result is not None:
                    return result
            elif isinstance(value, list):
                for item in value:
                    if isinstance(item, dict):
                        result = search_key(item, target_key)
                        if result is not None:
                            return result
    return None

def load_data_from_file(file_path):
    """
    Load JSON data from a file.
    
    :param file_path: The path to the file.
    :return: The loaded data, or an error message if the file could not be loaded.
    """
    try:
        with open(file_path, 'r') as file:
            data = json.load(file)
        return data
    except FileNotFoundError:
        return {"error": "File not found."}
    except json.JSONDecodeError:
        return {"error": "Error decoding JSON."}

def load_and_search(file_path, target_key):
    """
    Load JSON data from a file and search for a key in the loaded data.
    
    :param file_path: The path to the file.
    :param target_key: The key to search for.
    :return: The value associated with the key, or an error message if the file could not be loaded or the key is not found.
    """
    data = load_data_from_file(file_path)
    
    if isinstance(data, dict):
        value = search_key(data, target_key)
        if value is not None:
            return value
        else:
            return f"Key '{target_key}' not found."
    elif isinstance(data, dict) and "error" in data:
        return data["error"]
    else:
        return "Invalid JSON structure."

# Example usage
if __name__ == "__main__":
    file_path = r"C:\Users\paul\Desktop\Better Pronto\LoginToken_Response.json"
    key_to_search = "logintoken"
    result = load_and_search(file_path, key_to_search)
    print(result)
