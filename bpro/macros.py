from pronto import Pronto
from readjson import ReadJSON
from systemcheck import *
from datetime import datetime

pronto = Pronto()

def get_all_bubble_members(accesstoken, bubble_id, json_path):
    """
    Function to get all members of a bubble by looping through all pages
    and save the combined result to a JSON file.
    """
    print(f"Fetching all members for bubble ID: {bubble_id}")
    all_members = []
    current_page = 1
    has_more_pages = True
    
    try:
        while has_more_pages:
            print(f"Fetching page {current_page}...")
            response = pronto.bubbleMembershipSearch(accesstoken, bubble_id, page=current_page)
            
            if not response or 'ok' not in response or not response['ok']:
                print(f"Error in response for page {current_page}: {response}")
                break
                
            if 'memberships' in response and response['memberships']:
                # Extract user data from the memberships array
                page_members = []
                for membership in response['memberships']:
                    if 'user' in membership:
                        page_members.append(membership['user'])
                    
                all_members.extend(page_members)
                print(f"Retrieved {len(page_members)} members from page {current_page}")
                
                # Check if we've reached the last page
                pagesize = response.get('pagesize', 30)  # Default page size is 30
                if len(response['memberships']) < pagesize:
                    has_more_pages = False
                    print("Reached last page of members")
                else:
                    current_page += 1
            else:
                print(f"No memberships found in response for page {current_page}")
                has_more_pages = False
        
        # Save all members to the specified JSON file
        if all_members:
            result = {
                "ok": True,
                "users": all_members,
                "total_members": len(all_members),
                "bubble_id": bubble_id,
                "retrieved_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            ReadJSON.save_response_to_file(result, json_path)
            print(f"Saved {len(all_members)} members to {json_path}")
            return result
        else:
            print("No members found for this bubble")
            return {"ok": False, "error": "No members found"}
            
    except Exception as e:
        print(f"Error retrieving bubble members: {e}")
        return {"ok": False, "error": str(e)}